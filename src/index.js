// Require the necessary discord.js classes
const { Collection, Events, REST, Routes, Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require("discord.js");
const token = process.env.token;
const bot_uid = process.env.bot_uid;
const fs = require("node:fs");
const path = require('node:path');

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

const betterrand = require("seedrandom");
const postgres = require("postgres");
//const fetch = require('node-fetch')

Math.seedrandom = betterrand();
rng = betterrand.xor4096(Math.seedrandom().toString()+token+bot_uid+"hehe"+Date.now(), { entropy: true });
// "yeah that looks like a random enough seed"

/**
 * An interface to a database which has two sub-databases:
 * `usr`: is a k/v store of userid to user object
 * `conf`: is a k/v store of configuration flags, on per-server basis
 *
 * a user object is a k/v store of user properties (balance, debt, etc) to value
 *
 * The database has an in-memory cached copy, which is written to disk every change (to avoid repetitive reads)
 */
class DB {
  /**
   * Creates database
   * @constructor
   * @param {string} file - JSON filename
  */
  constructor(file) {
    this.sql = postgres({ host: "db", username: process.env.POSTGRES_USER, password: process.env.POSTGRES_PASSWORD, port: 5433 }); // defaluts to env vars anyway
    this.init();
  }

  async init() {
    let retries = 0;
    while (retries < 5) {
      try {
        await this.sql`create table if not exists users(snowflake bigint primary key, bal int default 2000, debt int default 0, last_daily date);`
        await this.sql`create table if not exists server(snowflake bigint primary key, loanpool int default 5000, jackpot int, totallost int default 0, totalwon int default 0)`;
        retries = 999;
      } catch (e) {
        if (e && retries < 5) {
          await new Promise(r => setTimeout(r, 5000));
          console.log(`request failed, retrying... (${++retries}/5) => ${e}`);
        } else {
          throw e;
        }
      }
    }
  }

  /**
   * Retrieve value of `conf`
   * @param {string} server - ID of server to retrieve data for
   * @param {string} field - field to retrieve
  */
  async getconf(server, field) {
    let result = await this.sql`
      select ${this.sql(field)} from server where snowflake = ${server}
    `
    return result[0][field];
  }

  /**
   * Increase value of `conf`
   * @param {string} server - ID of server to retrieve data for
   * @param {string} field - field to retrieve
   * @param {number} val - amount to increase by (negative for decrease)
  */
  async modconf(server, field, val) {
    let result = await this.sql`
      update server set ${this.sql(field)} = ${this.sql(field)} + ${val} where snowflake = ${server} returning ${this.sql(field)}
    `;

    if (field < 0) console.warn(`WARN: negative value detected at conf:${server}:${field}`);
  }

  /**
   * Retrieve value of `usr`
   * @param {string} usr - ID of user to retrieve data for
   * @param {string} field - field to retrieve
  */
  async getusr(usr, field) {
    let result = await this.sql`
      select ${this.sql(field)} from users where snowflake = ${usr}
    `
    return result[0][field];
  }

  /**
   * Increase value of `usr`
   * @param {string} usr - ID of user to retrieve data for
   * @param {string} field - field to retrieve
   * @param {number} val - amount to increase by (negative for decrease)
  */
  async modusr(usr, field, val) {
    let result = await this.sql`
      update users set ${this.sql(field)} = ${this.sql(field)} + ${val} where snowflake = ${usr} returning ${this.sql(field)}
    `;

    if (field < 0) console.warn(`WARN: negative value detected at usr:${usr}).${field}`);
  }

  /**
   * Create blank user if non-existent
   * @param {string} usr - ID of user
  */
  async udfltusr(usr) {
    let req = await this.sql`
      insert into users(snowflake) values (${usr}) on conflict do nothing
    `;

    return !!(req.count); // returns true if replaced
  }

  /**
   * Create blank user if non-existent
   * @param {string} usr - ID of user
  */
  async udfltconf(server) {
    await this.sql`
      insert into server(snowflake) values (${server}) on conflict do nothing
    `;
  }
};


// Create a new client instance
const client = new Client({ intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages, 
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMessageReactions
] });

// config index
// is split as so between various variables because "backwards compatibility"
const readx = JSON.parse(fs.readFileSync("/app/config/config.json"));

// make some things we want all the commands to know about properties of `client`
client.commands = new Collection();
client.datadb = new DB("./db.json");
client.emojistore = readx.emoji;
client.xconfig = readx.conf;
client.sleep = ms => new Promise(r => setTimeout(r, ms));
client.playing_rn ??= [];

// alias, because this was shoehorned on
client.currency = readx.conf.currency;

// bad function akin to python's `random.choice`, but takes random noise
// noise is derived from userid, to stop two different people simultaneously playing the same deal
Array.prototype.choose = function(noise) {
  let ix = Math.abs(rng.int32() + noise) % this.length;
  return this[ix];
};


for (const folder of commandFolders) {
  // Grab all the command files from the commands directory you created earlier
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      console.debug(`[DEBUG] Registering command in path ${filePath}`);
      commands.push(command.data.toJSON());
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}


const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationCommands(bot_uid),
      { body: commands },
    );

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();


// When the client is ready, run this code (only once)
client.once("ready", async () => {
  client.user.setActivity(`your every move`, { type: ActivityType.Watching });
  client.user.setStatus("online");
  console.log(`Ready! Bot is in ${client.guilds.cache.size} servers.`);
  await client.datadb.init();
  client.guilds.cache.forEach(async (guild) => {
    await client.datadb.udfltconf(guild.id);
  });
  
});

client.on(Events.InteractionCreate, async inter => {
  if (!inter.isChatInputCommand()) return;

  const com = inter.client.commands.get(inter.commandName);

  if (!com) {
    console.error(`No command matching ${inter.commandName} was found.`);
    return;
  }

  // ensure that there is always a forced balance
  if (await client.datadb.udfltusr(inter.user.id)) {
    inter.channel.send(`${inter.user} Hey! Welcome to JackBlack. Here is your $2000 welcome bonus!\n- Play your first game with \`/blackjack\`!\n- Claim your daily ${client.xconfig.daily} ${client.currency} with \`/daily\`!\n- See \`/help\` for all I can do!\n\n-# By playing this game, you confirm you are 18 or older.`);
  }

  await com.execute(inter);
});

// Login to Discord with your client's token
client.login(token);

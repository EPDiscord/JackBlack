const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily money amuont."),
  execute: async inter => {
    let candaily = await inter.client.datadb.sql`select last_daily from users where snowflake = ${inter.user.id} and last_daily is null or last_daily < 'today'`;

    if (candaily.length) { // can daily
      await inter.client.datadb.sql`update users set last_daily = 'today' where snowflake = ${inter.user.id}`;

      let d = inter.client.datadb.getusr(inter.user.id, "debt");
      if (d >= inter.client.xconfig.daily) {
        await inter.client.datadb.modusr(inter.user.id, "debt", -inter.client.xconfig.daily);
        await inter.client.datadb.modconf(inter.guildId, "loanpool", inter.client.xconfig.daily);

        await inter.reply(`Claimed daily of \`${inter.client.xconfig.daily} ${inter.client.currency}\`.\nDue to your outstanding debts, this has all been automatically redirected into paying them off.`);
      } else if (d > 0) {
        let left = inter.client.xconfig.daily - d;

        await inter.client.datadb.modusr(inter.user.id, "debt", -d);
        await inter.client.datadb.modusr(inter.user.id, "bal", left);

        await inter.reply(`Claimed daily of \`${inter.client.xconfig.daily} ${inter.client.currency}.\n${d} ${inter.client.currency}\` of this has been deducted to finish paying off your debts.`);
      } else {
        await inter.client.datadb.modusr(inter.user.id, "bal", inter.client.xconfig.daily);
        await inter.reply(`Successfully claimed daily of \`${inter.client.xconfig.daily} ${inter.client.currency}\`!`);
      }
    } else {
      s_until = ((Date.now()/86400_000>>0)+1)*86400;
      await inter.reply(`Daily already claimed today. Try again <t:${s_until}:R>`);
    }
  }
}

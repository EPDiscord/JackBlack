const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily money amount."),
  execute: async inter => {


    let candaily = await inter.client.datadb.sql`
      select last_daily from users
      where
        snowflake = ${inter.user.id} and last_daily < 'today'
        or
        snowflake = ${inter.user.id} and last_daily is null`;

    if (candaily.length) { // if anything was returned


      const dailyBooster = "1246226561959464980";
      const dailyContributor = "1288518414121304138";
      let multiplier = 1;

      if (inter.member.roles.cache.has(dailyBooster)) multiplier = 1.5;
      if (inter.member.roles.cache.has(dailyContributor)) multiplier = 2;
      

      let dailyTotal = inter.client.xconfig.daily * multiplier;

      await inter.client.datadb.sql`update users set last_daily = 'today' where snowflake = ${inter.user.id}`;

      let d = await inter.client.datadb.getusr(inter.user.id, "debt");
      if (d >= dailyTotal) {
        await inter.client.datadb.modusr(inter.user.id, "debt", -dailyTotal*multiplier);
        await inter.client.datadb.modconf(inter.guildId, "loanpool", dailyTotal*multiplier);

        await inter.reply(`Claimed daily of \`${inter.client.currency}${dailyTotal}\`.\nDue to your outstanding debts, this has all been automatically redirected into paying them off.`);
      } else if (d > 0) {
        let left = dailyTotal - d;

        await inter.client.datadb.modusr(inter.user.id, "debt", -d);
        await inter.client.datadb.modusr(inter.user.id, "bal", left);

        await inter.reply(`Claimed daily of \`${inter.client.currency}${dailyTotal}\`.\n\`${d} ${inter.client.currency}\` of this has been deducted to finish paying off your debts.`);
      } else {
        await inter.client.datadb.modusr(inter.user.id, "bal", dailyTotal);
        await inter.reply(`Successfully claimed daily of \`${inter.client.currency}${dailyTotal}\`!`);
      }
    } else {
      s_until = ((Date.now()/86400_000>>0)+1)*86400;
      await inter.reply(`Daily already claimed today. Try again <t:${s_until}:R>`);
    }
  }
}

const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Shows bot statistics. Only available for administrators.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute: async inter => {
    let data = await inter.client.datadb.sql`
      select loanpool, totallost, totalwon from server where snowflake = ${inter.guildId}
    `;

    console.log(data);

    await inter.reply({ content: `- There are ${data[0].loanpool} ${inter.client.currency} in the loan pool (only half of which can be obtained at once).\n- In BlackJack, a total of ${data[0].totallost} ${inter.client.currency} have been lost, and ${data[0].totalwon} ${inter.client.currency} have been won.`, ephemeral: true });
  }
}

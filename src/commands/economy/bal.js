const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Shows how much money you have."),
  execute: async inter => {
    let d = await inter.client.datadb.getusr(inter.user.id, "debt");
      await inter.reply({ content: `You currently have \`${await inter.client.datadb.getusr(inter.user.id, "bal")} ${inter.client.currency}.\`` +
       (d ? `\nYou have an outstanding debt of \`${inter.client.currency}${d}\`` : "Want more money? You can borrow money from Jack using \`/loan borrow\`"), ephemeral: true });
  }
}

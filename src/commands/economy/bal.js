const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Shows how much money you have.")
    .addUserOption(opt =>
      opt.setName("account")
            .setDescription("Whose balance do you wish to see?")
            .setRequired(false)),
  execute: async inter => {
    let account;
    account = inter.options.getUser("account");
    try {
      console.log(account);
    } catch (error) {
      console.log(error);
    }
    try {
      if (inter.user.id == account.id) {
        let d = await inter.client.datadb.getusr(inter.user.id, "debt");
        await inter.reply({ content: `You currently have \`${inter.client.currency}${await inter.client.datadb.getusr(inter.user.id, "bal")}\`.` +
         (d ? `\nYou have an outstanding debt of \`${inter.client.currency}${d}\`` : `\nWant more money? You can borrow money from Jack using \`/loan borrow\``), ephemeral: true });
      } else {
        let d = await inter.client.datadb.getusr(account.id, "debt");
        await inter.reply({ content: `${account.username} currently has \`${inter.client.currency}${await inter.client.datadb.getusr(account.id, "bal")}\`.` +
         (d ? `\nThey have an outstanding debt of \`${inter.client.currency}${d}\`` : ``), ephemeral: true });
      }
    } catch (exception) {
      await inter.reply({ content: `That user has never played a game.`, ephemeral: true })
    }
    
   
  }
}

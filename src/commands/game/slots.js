const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slots")
    .setDescription("Play a game of slots.")
    .setNSFW(true)
    .addIntegerOption(opt =>
        opt.setName("stake")
            .setDescription("How much you want to bet.")
            .setMinValue(1)
            .setRequired(true)),
  execute: async inter => {
         await inter.reply({ content: `This game is not available yet and will be released soon.`, ephemeral: true });
  }
}

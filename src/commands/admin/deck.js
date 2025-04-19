const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deck")
    .setDescription("Print out emojis. Only available for administrators.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
        opt.setName("category")
            .setDescription("Which category of emojis.")
            .setRequired(false)
            .addChoices(
              { name: 'Spades', value: 'spades' },
              { name: 'Hearts', value: 'hearts' },
              { name: 'Clubs', value: 'clubs' },
              { name: 'Diamonds', value: 'diamonds' },
              { name: 'Other', value: 'misc' },
              { name: 'Slots', value: 'slots' }
            )),
  execute: async inter => {
    if (inter.options.getString("category")) {
      await inter.reply({
        content: Object.values(inter.client.emojistore[inter.options.getString("category")]).join(""),
        ephemeral: true,
      });
    } else {
      await inter.reply({
        content: Object.values(inter.client.emojistore).map(i => Object.values(i)).flat().join(""),
        ephemeral: true,
      });
    }
  }
}

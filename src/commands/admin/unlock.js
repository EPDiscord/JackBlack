const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlocks a user's play. Only available for administrators.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
       option.setName("victim")
             .setDescription("Who to unlock.")
             .setRequired(true)),
  execute: async inter => {
    const who = inter.options.getUser("victim");
    
    let ix_where = inter.client.playing_rn.indexOf(inter.user.id);

    if (ix_where == -1) {
      await inter.reply({ content: `User \`${who.username}\` not locked (the bug's something else).`, ephemeral: true });
    } else {
      inter.client.playing_rn.splice(ix_where, 1);
      await inter.reply({ content: `Successfully unlocked user \`${who.username}\`.`, ephemeral: true });
    }
  }
}

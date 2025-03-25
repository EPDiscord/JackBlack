const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("editdata")
    .setDescription("Modifies a user's data. Only available for administrators.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
       option.setName("victim")
             .setDescription("Who to fiddle with the data of.")
             .setRequired(true))
    .addStringOption(option =>
        option.setName("field")
            .setDescription("What to change about the user.")
            .setRequired(true)
            .addChoices(
              { name: 'Balance', value: 'bal' },
              { name: 'Debt', value: 'debt' },
            ))
    .addIntegerOption(option =>
        option.setName("value")
            .setDescription("What to change the field to.")
            .setMinValue(0)
            .setRequired(true)),
  execute: async inter => {
    const who = inter.options.getUser("victim");
    const what = inter.options.getString("field");
    const val = inter.options.getInteger("value");

    let data = await inter.client.datadb.sql`
      update users set ${inter.client.datadb.sql(what)} = ${inter.client.datadb.sql(what)} + ${val} where snowflake = ${who.id} returning ${inter.client.datadb.sql(what)}
    `;
    await inter.reply({ content: `Edited \`${what}\` for \`${who}\`. Set value to \`${val}\`.`, ephemeral: true });
  }
}

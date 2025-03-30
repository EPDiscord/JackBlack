const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("editdata")
    .setDescription("Modifies a user's data. Only available for Azrael.")
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

    if (inter.user.id != "125685156064395264") {
      inter.reply({ content: "Error: No permissions to use this command.", ephemeral: true });
    } else {

      const who = inter.options.getUser("victim");
      const what = inter.options.getString("field");
      const val = inter.options.getInteger("value");
  
      try {
        let data = await inter.client.datadb.sql`
          update users set ${inter.client.datadb.sql(what)} = ${val}
          where snowflake = ${who.id} 
          returning ${inter.client.datadb.sql(what)}
        `;
  
        if (data.length === 0) {
          return inter.reply({ content: "User not found in the database!", ephemeral: true });
        }
        
      await inter.reply({ content: `Successfully updated the \`${what}\` for \`${who.username}\`. Set value to \`${val}\`.`, ephemeral: true });
      } catch (erorr) {
        console.error(error);
        inter.reply({ content: "An error occurred while updating the database.", ephemeral: true });
      }
    }
  }
}

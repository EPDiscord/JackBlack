const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("russianroulette")
    .setDescription("Play a game of Russian roulette.")
    .setNSFW(true),
  execute: async inter => {
    // Array.prototype.choose is already defined to use special "better" random function, because am lazy i do this
    let output = ([0, 3, 1, 7, 1, 4])
      .choose(inter.user.id & 0xffff_ffff);

    let embed;
    if (output) {
      embed = new EmbedBuilder()
        .setColor("#66cc44")
        .setTitle("Blank!")
        .setDescription(`You live another day.`)
        .addFields(
          { name: `The gun also shot out \`${inter.client.currency}${output}\`.`, value: "There's otherwise no appeal to play." },
        )
        .setFooter({ text: "JackBlack by firefish111", iconURL: "https://cdn.discordapp.com/avatars/871048036342710312/fdabfe1e8f750469342c73374c430184.webp" });

      await inter.client.datadb.modusr(inter.user.id, "bal", output);
    } else {
      let n = await inter.client.datadb.getusr(inter.user.id, "bal");
      embed = new EmbedBuilder()
        .setColor("#cc6644")
        .setTitle("Fire!")
        .setDescription(`You died. There goes all your \`${inter.client.currency}${bal}\`.`)
        .addFields(
          { name: "Yep, all gone.", value: "This is Death™. We couldn't afford real death." },
        )
        .setFooter({ text: "JackBlack by firefish111", iconURL: "https://cdn.discordapp.com/avatars/871048036342710312/fdabfe1e8f750469342c73374c430184.webp" });

      await inter.client.datadb.sql`
        update users set bal = 0
        where snowflake = ${inter.user.id};
      `;
    }

    await inter.reply({
      embeds: [embed],
      ephemeral: false,
    });
  }
}

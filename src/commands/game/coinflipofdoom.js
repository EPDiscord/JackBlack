const { ButtonStyle, ButtonBuilder, ActionRowBuilder, EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coinflipofdoom")
    .setDescription("This game is too dangerous. Only play if incredibly desperate.")
    .setNSFW(true),
  execute: async inter => {
    if (await inter.client.datadb.getusr(inter.user.id, "debt") < 6e3) {
      await inter.reply({ content: `You do not want to do this.\nOnly those desperate enough (thats >${inter.client.currency}6k in debt we decided) can play.`, ephemeral: true });
      return;
    }

    // Array.prototype.choose is already defined to use special "better" random function, because am lazy i do this
    let won = Math.seedrandom() - 0.5;
    let output = won > 0;

    const confirmBut = new ButtonBuilder()
      .setCustomId("yes")
      .setLabel("Yes, I'm sure that I'm sure")
      .setStyle(ButtonStyle.Primary);

    const cancelBut = new ButtonBuilder()
      .setCustomId("no")
      .setLabel("No thanks")
      .setStyle(ButtonStyle.Secondary);

    const buts = new ActionRowBuilder().addComponents(confirmBut, cancelBut);

    await inter.reply({
      content: "Are you extremely, absolutely, verifiably, utmostly sure that you really want to do this?",
      compenents: [buts],
      ephermetal: false,
    });

    // make sure that only the person asking is responding (just to make sure, even though it's ephemeral)
    let userFilter = i => i.user.id === inter.user.id;
    
    try {
      let resp = await inter.awaitMessageComponent({ filter: userFilter, time: 30_000 });

      if (resp.customId === "yes") {
        let embed;
        if (output) {
          embed = new EmbedBuilder()
            .setColor("#66cc44")
            .setTitle("Your debt is gone!")
            .setDescription(won > 0.2 ? "Phew. You did it." : `That was close though, the coin was ${won*100}% away from landing the other way.`)
            .setFooter({ text: "JackBlack by firefish111", iconURL: "https://cdn.discordapp.com/avatars/871048036342710312/fdabfe1e8f750469342c73374c430184.webp" });

          await inter.client.datadb.sql`
            update users set debt = 0
            where snowflake = ${inter.user.id};
          `;
        } else {
          let n = await inter.client.datadb.getusr(inter.user.id, "bal");
          embed = new EmbedBuilder()
            .setColor("#cc6644")
            .setTitle("Oops...")
            .setDescription("You lost.")
            .addFields(
              n 
                ? { name: `Hope you didn't like having that \`${inter.client.currency}${n}\`...`, value: "...cause it's gone." }
                : { name: "You have no money (😢), so um...", value: "...we doubled your debt. It's only fair." }
            )
            .setFooter({ text: "JackBlack by firefish111", iconURL: "https://cdn.discordapp.com/avatars/871048036342710312/fdabfe1e8f750469342c73374c430184.webp" });

          if (n) {
            await inter.client.datadb.sql`
              update users set bal = 0
              where snowflake = ${inter.user.id};
            `;
          } else {
            await inter.client.datadb.sql`
              update users set debt = debt * 2
              where snowflake = ${inter.user.id};
            `;
          }
        }

        await resp.update({
          embeds: [embed],
          content: null,
          components: [],
          ephemeral: false,
        });
      } else if (resp.customId === "no") {
        await inter.editReply({ content: "Wise choice.", components: [], ephemeral: true });
      }
    } catch (error) {
      await inter.editReply({ content: "Game cancelled - timed out after 30 seconds.", components: [], ephemeral: true });
      console.log(error);
    }
  }
}

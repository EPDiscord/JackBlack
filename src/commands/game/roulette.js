const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roulette")
    .setDescription("Play a game of slots.")
    .setNSFW(true)
    .addStringOption(opt =>
        opt.setName("bet")
            .setDescription("Which space do you wish to bet on? [0-36] [red] [black].")
            .setRequired(true))
    .addIntegerOption(opt =>
        opt.setName("stake")
            .setDescription("How much you want to bet.")
            .setMinValue(1)
            .setRequired(true)),
  execute: async inter => {
       if (inter.user.id == "125685156064395264") {
        
        // Make Embed
        let mkEmbed = stake => new EmbedBuilder()
            .setColor("#c82626")
            .setTitle("Roulette")
            .setDescription(`Stake: ${inter.client.currency}${stake}`)
            .setFooter({ text: "JackBlack by firefish111", iconURL: "https://cdn.discordapp.com/avatars/871048036342710312/fdabfe1e8f750469342c73374c430184.webp" });

        let balanc = await inter.client.datadb.getusr(inter.user.id, "bal");
        if (balanc == 0) {
            await inter.reply({ content: `You are broke!\nYou cannot bet. Make a loan using \`/loan borrow\`.`, ephemeral: true });
            return;
        }

        if (inter.options.getInteger("stake") > balanc) {
            await inter.reply({ content: `You do not have enough money to fulfil this bet.`, ephemeral: true });
            return;
        }

        inter.client.playing_rn ??= [];

        if (inter.client.playing_rn.includes(inter.user.id)) {
        await inter.reply({ content: `You cannot play two games at the same time.`, ephemeral: true });
        return;
        }

        inter.client.playing_rn.push(inter.user.id);

        let game = await inter.reply({
            embeds: [mkEmbed(inter.options.getInteger("stake"))],
            components: [input],
            ephemeral: false,
        });
       } else {
        await inter.reply({ content: `This game is not available yet and will be released soon.`, ephemeral: true });
       }  
  }
}

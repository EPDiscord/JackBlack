const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows you what you can do with JackBlack."),
  execute: async inter => await inter.reply(
    "Here's everything you can do with JackBlack:\n\n- Check your balance with `/balance`.\n- Play blackjack with `/blackjack`.\n- Claim your daily salary with `/daily`.\n- Out of money? Take out a loan with `/loan borrow`. Pay back your loan with `/loan payoff`.\n- Use `/transfer` to give your money to other gamblers.\n\n-# Please gamble responsibly." 
  ),
}

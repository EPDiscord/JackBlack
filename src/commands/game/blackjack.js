const { ButtonStyle, ButtonBuilder, ActionRowBuilder, EmbedBuilder, SlashCommandBuilder } = require("discord.js");

// true value - gets the true value of a card (takes into account aces)
let trueV = (card, used) => /\d+/g.test(card) ? Number(card) : card == "A" ? (used ? 1 : 11) : (card == "down" ? NaN : 10);

// evaluate hand
let collect = hand => hand.reduce((total, next) => total + trueV(next.card, next.used), 0);

// cards
const cards = [
  "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"
];

// suits
const suits = [
  "spades", "hearts", "clubs", "diamonds"
]

module.exports = {
  data: new SlashCommandBuilder()
    .setName("blackjack")
    .setDescription("Play a game of blackjack.")
    .setNSFW(true)
    .addIntegerOption(opt =>
        opt.setName("stake")
            .setDescription("How much you want to bet.")
            .setMinValue(5)
            .setRequired(true)),
  execute: async inter => {
    // used for randomness (was possible otherwise for two people to call the command at the same time and get the same game)
    const uid = inter.user.id & 0xffff_ffff;
    const buid = inter.user.id.slice(0, 10) & 0xffff_ffff;

    // hands
    let player, banker;

    // ace verify (gives you always the highest possible value that's < 21 with all aces)
    let ace = who => {
      let nextAce = (who ? player : banker)
        .findIndex(i => i.card === "A" && !i.used);
      if (collect((who ? player : banker)) > 21 && nextAce !== -1)
        (who ? player : banker)[nextAce].used = true;
    }

    // draw card
    let genCard = who => {
      let ix = {
        card: cards.choose(uid+buid+who),
        suit: suits.choose(-buid+who)
      };
      if (ix.card === "A") ix.used = false;
      (who ? player : banker).push(ix);
    }

    // card to emoji
    let toEmoji = box => inter.client.emojistore[box.suit][box.card];

    // make embed thunk
    let mkEmbed = (stake, delay) => new EmbedBuilder()
      .setColor("#c82626")
      .setTitle("BlackJack")
      .setDescription(`Stake: ${inter.client.currency}${stake}` + (delay ? `\nAutomatic forfeit <t:${Math.floor((Date.now()+delay)/1000)}:R>` : ""))
      .addFields(
        { name: `Banker ${isNaN(collect(banker)) ? "" : `(${collect(banker) > 21 ? "bust!" : collect(banker)})`}`, value: `${banker.map(toEmoji).join(" ")}` },
        { name: "\u200B", value: "\u200B" },
        { name: `Player (${collect(player) > 21 && player.length > 2 ? "bust!" : collect(player)})`, value: `${player.map(toEmoji).join(" ")}` },
      );

    let balanc = await inter.client.datadb.getusr(inter.user.id, "bal");
    if (balanc == 0) {
      await inter.reply({ content: `You are broke!\nYou cannot bet. Make a loan using \`/loan borrow\`.`, ephemeral: true });
      return;
    }

    if (inter.options.getInteger("stake") > balanc) {
      await inter.reply({ content: `You do not have enough money to fulfil this bet.`, ephemeral: true });
      return;
    }
    
    // keeps an in-memory list of all people playing, so that you can't just start another game if you get a hand you don't like.
    // writing this to the db would be a: unnecessary db writes, and b: if the bot dies during a game, no new games can be started
    inter.client.playing_rn ??= [];

    if (inter.client.playing_rn.includes(inter.user.id)) {
      await inter.reply({ content: `You cannot play two games at the same time.`, ephemeral: true });
      return;
    }

    inter.client.playing_rn.push(inter.user.id);
    

    stop = false;
    
    player = [], banker = [];
    genCard(true); genCard(true);
    genCard(false);
    banker.push({ card: "down", suit: "misc" });
    ace(true);
    
    const hitBut = new ButtonBuilder()
      .setCustomId("hit")
      .setLabel("Hit")
      .setEmoji(inter.client.emojistore.misc.hit)
      .setStyle(ButtonStyle.Success);

    const standBut = new ButtonBuilder()
      .setCustomId("stand")
      .setLabel("Stand")
      .setEmoji(inter.client.emojistore.misc.stand)
      .setStyle(ButtonStyle.Danger);

    const input = new ActionRowBuilder().addComponents(hitBut, standBut);

    const FORFEIT_AFTER = 300_000; // 300 sec = 5min

    let game = await inter.reply({
      embeds: [mkEmbed(inter.options.getInteger("stake"), FORFEIT_AFTER)],
      components: [input],
      ephemeral: false,
    });

    while (player.length < 5 && collect(player) < 21 && !stop) { // play
      // ace is 1 OR 11
      ace(true);

      // stop hijacking others' games
      let userFilter = i => i.user.id === inter.user.id;

      try {
        // buttons
        let resp = await game.awaitMessageComponent({ filter: userFilter, time: FORFEIT_AFTER });
        switch (resp.customId) {
        case "hit":
          genCard(true);
          ace(true);
          break;
        case "stand":
          stop = true;
          break;
        default:
          throw "hmmm, neither hit nor stand (BAD!)";
        }

        await resp.update({
          embeds: [mkEmbed(inter.options.getInteger("stake"), FORFEIT_AFTER)],
          components: stop ? [] : [input],
          ephemeral: false,
        });
      } catch (_) {
        await inter.editReply({
          embeds: [
            mkEmbed(inter.options.getInteger("stake"))
            .addFields({
              name: "Timeout; automatic forfeit.",
              value: `You lose \`${inter.client.currency}${inter.options.getInteger("stake")}\`.\n(don't try to dodge unfavourable cards, nice try)`,
              inline: true,
            })
          ],
          components: [],
          ephemeral: false
        });

        await inter.client.datadb.modusr(inter.user.id, "bal", -inter.options.getInteger("stake")); // negative if lost, positive if won
        await inter.client.datadb.modconf(inter.guildId, `totallost`, inter.options.getInteger("stake"));

        // no longer playing
        inter.client.playing_rn.splice(inter.client.playing_rn.indexOf(inter.user.id), 1);
        return;
      }
    }

    // be rid of face down (superficially, turn it over)
    banker.pop();
    genCard(false); ace(false);

    // end game thunk
    // won = -1 => loss
    // won = 0 => pushback
    // won = 1 => win
    const end = async (won, how) => {
      let realwin = Math.floor(inter.options.getInteger("stake") * won);
      await inter.editReply({
        embeds: [
          mkEmbed(inter.options.getInteger("stake"))
          .addFields({
            name: how,
            value: `You ${realwin >= 1 ? 'win' : realwin == 0 ? 'keep your' : 'lose'} \`${inter.client.currency}${Math.abs(realwin == 0 ? inter.options.getInteger("stake") : realwin)}\`${realwin > 0 ? '!' : '.'}`,
            inline: true,
          })
        ],
        components: [],
        ephemeral: false,
      });

      await inter.client.datadb.modusr(inter.user.id, "bal", realwin); // negative if lost, positive if won
      if (won != 0) await inter.client.datadb.modconf(inter.guildId, `total${won >= 1 ? 'won' : 'lost'}`, Math.abs(realwin));

      // no longer playing
      inter.client.playing_rn.splice(inter.client.playing_rn.indexOf(inter.user.id), 1);
    }

    if ((collect(player) === 21 && player.length === 2) && (collect(banker) < 21)) {
      end(1.5, "BlackJack!");
      return;
    }

    if (collect(player) <= 21) {
      while (collect(banker) < collect(player) && banker.length < 5) {
        genCard(false);
        ace(false);
      }
    }

    // five-card trick
    if (player.length === 5 && collect(player) <= 21 && (banker.length < 5 || (banker.length == 5 && collect(player) > collect(banker)))) {
      end(1, "Five card trick!");
      return;
    } else if (collect(banker) > 21) {
      end(1, "Banker bust!"); // there is no "you beat the banker" as banker will never stand less than player
      return; // have to return otherwise banker will unbust
    } else if (collect(banker) === collect(player)) { // pushback (noone loses any money) for fairness
      end(0, "Tie; Pushback.");
      return;
    }
    
    // ways to lose
    if (collect(player) > 21) {
      end(-1, "You bust.");
    } else if (banker.length === 2 && collect(banker) === 21) {
      end(-1, "Banker's BlackJack.");
    } else if (banker.length === 5 && collect(banker) <= 21) {
      end(-1, "Banker's five card trick."); // fivecard trick value doesnt actually matter, banker just better than player
    } else if (collect(banker) > collect(player)) {
      end(-1, "Banker beat you.");
    } else { // in case of an edge case, you lose by default
      end(-1, "You lost.");
    }
  }
}

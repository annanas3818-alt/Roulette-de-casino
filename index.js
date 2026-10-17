const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;

// Base de données simple en mémoire
const users = new Collection();
const games = new Collection();

function getUser(id) {
  if (!users.has(id)) {
    users.set(id, { money: 1000, wins: 0, games: 0 });
  }
  return users.get(id);
}

client.once('ready', () => {
  console.log(`Bot connecté en tant que ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  // Commande /roulette
  if (interaction.isChatInputCommand() && interaction.commandName === 'roulette') {
    const embed = new EmbedBuilder()
      .setTitle('Roulette Casino - Couronne')
      .setDescription('Devinez le numéro ou la couleur avant que la bille s\'arrête !\n\n**Multijoueur** — Tout le monde mise, puis la roue tourne.\n**Solo** — Tu joues seul contre le bot.')
      .setColor('#FFD700')
      .setFooter({ text: 'Monnaie : Couronne' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('create_multi')
        .setLabel('Créer une partie')
        .setStyle(ButtonStyle.Success)
        .setEmoji('👥'),
      new ButtonBuilder()
        .setCustomId('solo')
        .setLabel('Solo (vs Bot)')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🤖')
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  // Boutons
  if (interaction.isButton()) {
    const user = getUser(interaction.user.id);

    if (interaction.customId === 'solo') {
      const betEmbed = new EmbedBuilder()
        .setTitle('Mode Solo')
        .setDescription(`Tu as **${user.money}** Couronnes.\n\nChoisis ta mise :`)
        .setColor('#00FF00');

      const betRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('bet_50').setLabel('50').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('bet_100').setLabel('100').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('bet_250').setLabel('250').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('bet_500').setLabel('500').setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({ embeds: [betEmbed], components: [betRow], ephemeral: true });
    }

    if (interaction.customId.startsWith('bet_')) {
      const amount = parseInt(interaction.customId.split('_')[1]);
      if (user.money < amount) {
        return interaction.reply({ content: 'Tu n\'as pas assez de Couronnes !', ephemeral: true });
      }

      user.money -= amount;
      user.games++;

      // Tirage réaliste (0-36)
      const number = Math.floor(Math.random() * 37);
      const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(number);
      const color = number === 0 ? 'Vert' : (isRed ? 'Rouge' : 'Noir');

      // Pour simplifier : on gagne x2 si on avait misé (simulation)
      const win = Math.random() < 0.48; // légère edge maison
      let resultText = '';

      if (win) {
        const gain = amount * 2;
        user.money += gain;
        user.wins++;
        resultText = `**Gagné !** +${gain} Couronnes`;
      } else {
        resultText = `**Perdu...** -${amount} Couronnes`;
      }

      const resultEmbed = new EmbedBuilder()
        .setTitle('Résultat de la Roulette')
        .setDescription(`La bille s'arrête sur **${number} ${color}**\n\n${resultText}\n\nSolde actuel : **${user.money}** Couronnes`)
        .setColor(win ? '#00FF00' : '#FF0000');

      await interaction.update({ embeds: [resultEmbed], components: [] });
    }

    if (interaction.customId === 'create_multi') {
      await interaction.reply({ content: 'Mode Multijoueur bientôt disponible dans la prochaine version ! Pour l\'instant utilise Solo.', ephemeral: true });
    }
  }
});

// Enregistrement de la commande slash
client.on('ready', async () => {
  try {
    await client.application.commands.set([
      {
        name: 'roulette',
        description: 'Ouvre le menu de la roulette casino'
      },
      {
        name: 'solde',
        description: 'Voir ton solde de Couronnes'
      },
      {
        name: 'classement',
        description: 'Voir le classement des joueurs'
      }
    ]);
  } catch (e) {
    console.error(e);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const user = getUser(interaction.user.id);

  if (interaction.commandName === 'solde') {
    await interaction.reply(`Tu as **${user.money}** Couronnes.`);
  }

  if (interaction.commandName === 'classement') {
    const sorted = [...users.entries()]
      .sort((a, b) => b[1].wins - a[1].wins)
      .slice(0, 10);

    let desc = '';
    sorted.forEach(([id, data], i) => {
      const medal = i === 0 ? '1.' : i === 1 ? '2.' : i === 2 ? '3.' : `${i+1}.`;
      desc += `${medal} <@${id}> — ${data.wins}V / ${data.games}P\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle('Classement Roulette (Couronne)')
      .setDescription(desc || 'Aucun joueur pour le moment.')
      .setColor('#FFD700');

    await interaction.reply({ embeds: [embed] });
  }
});

client.login(TOKEN);

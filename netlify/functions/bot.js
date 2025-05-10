const { EmbedBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const bodyParser = require('body-parser');
const { verifyKey } = require('discord-interactions');

// Configurações do bot
const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  embed: {
    color: 0x00ff00,
    title: 'Mensagem Replicada',
    author: { name: 'Seu Bot', iconURL: 'https://example.com/icon.png' },
    footer: { text: 'Bot criado com ❤️', iconURL: 'https://example.com/footer-icon.png' },
    timestamp: true,
  },
};

// Configuração do Express
const app = express();
app.use(bodyParser.json());

// Função para registrar comandos
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.token);
  const commands = [
    {
      name: 'reply',
      description: 'Replica uma mensagem em um embed customizável',
      options: [
        {
          name: 'mensagem',
          description: 'A mensagem a ser replicada',
          type: 3,
          required: true,
        },
      ],
    },
  ];

  try {
    console.log('Registrando comandos...');
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
    console.log('Comandos registrados com sucesso!');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
  }
}

// Função principal do Netlify
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  const signature = event.headers['x-signature-ed25519'];
  const timestamp = event.headers['x-signature-timestamp'];
  const body = JSON.parse(event.body);

  // Verificar assinatura
  const isValidRequest = verifyKey(
    Buffer.from(timestamp + JSON.stringify(body)),
    signature,
    process.env.PUBLIC_KEY
  );

  if (!isValidRequest) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Assinatura inválida' }) };
  }

  // Responder a pings
  if (body.type === 1) {
    return { statusCode: 200, body: JSON.stringify({ type: 1 }) };
  }

  // Processar comando
  if (body.type === 2 && body.data.name === 'reply') {
    const mensagem = body.data.options[0].value;
    const embed = new EmbedBuilder()
      .setColor(config.embed.color)
      .setTitle(config.embed.title)
      .setDescription(mensagem)
      .setAuthor(config.embed.author)
      .setFooter(config.embed.footer)
      .setTimestamp(config.embed.timestamp ? new Date() : null);

    return {
      statusCode: 200,
      body: JSON.stringify({
        type: 4,
        data: { embeds: [embed.toJSON()] },
      }),
    };
  }

  return { statusCode: 400, body: JSON.stringify({ error: 'Interação não suportada' }) };
};

// Registrar comandos (executar apenas uma vez ou em deploy)
registerCommands();

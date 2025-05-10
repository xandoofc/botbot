const { Client, EmbedBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const bodyParser = require('body-parser');

// Configurações do bot
const config = {
  token: process.env.DISCORD_TOKEN, // Adicione o token no ambiente do Netlify
  clientId: process.env.CLIENT_ID, // ID do bot
  guildId: process.env.GUILD_ID, // ID do servidor (opcional, para testes)
  embed: {
    color: 0x00ff00, // Cor do embed (verde, em hexadecimal)
    title: 'Mensagem Replicada',
    author: {
      name: 'Seu Bot',
      iconURL: 'https://example.com/icon.png', // URL do ícone do autor
    },
    footer: {
      text: 'Bot criado com ❤️',
      iconURL: 'https://example.com/footer-icon.png', // URL do ícone do rodapé
    },
    timestamp: true, // Mostrar timestamp
  },
};

// Configuração do Express para Netlify Functions
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
          type: 3, // String
          required: true,
        },
      ],
    },
  ];

  try {
    console.log('Registrando comandos...');
    // Registro global (use guildId para servidor específico)
    await rest.put(Routes.applicationCommands(config.clientId), {
      body: commands,
    });
    console.log('Comandos registrados com sucesso!');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
  }
}

// Função principal do Netlify
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método não permitido' }),
    };
  }

  const signature = event.headers['x-signature-ed25519'];
  const timestamp = event.headers['x-signature-timestamp'];
  const body = JSON.parse(event.body);

  // Verificar a assinatura do Discord (necessário para interações)
  const { verify } = require('discord.js');
  const isValidRequest = verify(
    Buffer.from(timestamp + JSON.stringify(body)),
    Buffer.from(process.env.PUBLIC_KEY, 'hex'),
    Buffer.from(signature, 'hex')
  );

  if (!isValidRequest) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Assinatura inválida' }),
    };
  }

  // Responder a pings do Discord
  if (body.type === 1) {
    return {
      statusCode: 200,
      body: JSON.stringify({ type: 1 }),
    };
  }

  // Processar comando
  if (body.type === 2) {
    const commandName = body.data.name;
    if (commandName === 'reply') {
      const mensagem = body.data.options[0].value;

      // Criar embed
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
          type: 4, // ChannelMessageWithSource
          data: {
            embeds: [embed.toJSON()],
          },
        }),
      };
    }
  }

  return {
    statusCode: 400,
    body: JSON.stringify({ error: 'Interação não suportada' }),
  };
};

// Registrar comandos ao iniciar (pode ser executado separadamente)
registerCommands();

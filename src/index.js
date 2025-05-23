const { EmbedBuilder, REST, Routes, Client } = require('discord.js');
const express = require('express');
const bodyParser = require('body-parser');
const { verifyKey } = require('discord-interactions');

// Configurações do bot
const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID, // Opcional, para testes em um servidor
  embed: {
    color: 0x00ff00, // Verde
    title: '',
    author: {
      name: '',
      iconURL: '',
    },
    timestamp: false,
  },
};

// Verificar variáveis de ambiente
if (!config.token) {
  console.error('Erro: DISCORD_TOKEN não está definido nas variáveis de ambiente.');
  process.exit(1);
}
if (!config.clientId) {
  console.error('Erro: CLIENT_ID não está definido nas variáveis de ambiente.');
  process.exit(1);
}
if (!process.env.PUBLIC_KEY) {
  console.error('Erro: PUBLIC_KEY não está definido nas variáveis de ambiente.');
  process.exit(1);
}

// Inicializar Express
const app = express();
app.use(bodyParser.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Registrar comandos
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
    // Registro no servidor específico (mude para global removendo guildId)
    await rest.put(
      config.guildId
        ? Routes.applicationGuildCommands(config.clientId, config.guildId)
        : Routes.applicationCommands(config.clientId),
      { body: commands }
    );
    console.log('Comandos registrados com sucesso!');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
  }
}

// Endpoint para interações do Discord
app.post('/interactions', async (req, res) => {
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const body = req.body;

  // Verificar assinatura
  const isValidRequest = verifyKey(
    Buffer.from(timestamp + JSON.stringify(body)),
    signature,
    process.env.PUBLIC_KEY
  );

  if (!isValidRequest) {
    return res.status(401).json({ error: 'Assinatura inválida' });
  }

  // Responder a pings
  if (body.type === 1) {
    return res.status(200).json({ type: 1 });
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

    return res.status(200).json({
      type: 4, // ChannelMessageWithSource
      data: { embeds: [embed.toJSON()] },
    });
  }

  return res.status(400).json({ error: 'Interação não suportada' });
});

// Iniciar servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  registerCommands(); // Registrar comandos ao iniciar

  // Opcional: Conectar bot para status online (descomente se necessário)
  /*
  const client = new Client({ intents: [] });
  client.login(config.token).then(() => {
    console.log('Bot conectado ao Discord!');
    client.user.setPresence({ status: 'online' });
  }).catch(err => console.error('Erro ao conectar bot:', err));
  */
});

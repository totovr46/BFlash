module.exports = {
  apps: [
    {
      name: 'BFlash-backend',
      script: 'server/server.js',
      cwd: './', // directory corrente, dove si trova .env
      env: {
        NODE_ENV: 'development',
        MONGODB_URI: 'mongodb+srv://salvatore:N2zCSrSJ0mDq0Xgq@bflash.6wx9rmo.mongodb.net/?retryWrites=true&w=majority&appName=bFlash',
        JWT_SECRET: 'IYGCAEI&£$R£4q884hf9823Cs8cnGUSAVRasvf%rfaij',
        PORT: 5050
      }
    }
  ]
}

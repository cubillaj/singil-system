import "dotenv/config";
import cors from "cors";
import express from "express";
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import morgan from 'morgan'
const app = express();

const devOrigins = ['http://localhost:5173', 'http://localhost:5174']

app.use(helmet())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : devOrigins,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser())

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

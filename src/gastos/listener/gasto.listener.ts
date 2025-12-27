
import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GastoListener {
  @OnEvent('gasto.creada', { async: true }) // async: true = no bloquea
  async handleVentaCreada(payload: { numero: string; mensaje: string }) {
    try {
      await axios.post(
        `http://147.79.107.102:3000/whatsapp-message/api/whatsapp/enviar`,
        {
          numero: payload.numero,
          mensaje: payload.mensaje,
        },
        {
          auth: {
            username: process.env.WSP_USER,
            password: process.env.WSP_PASS,
          },
        },
      );
      console.log('✅ WhatsApp enviado por EventEmitter');
    } catch (error) {
      console.error('❌ Error enviando WhatsApp:', error.message);
    }
  }
}

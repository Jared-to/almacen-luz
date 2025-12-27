import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface NotificationEvent {
  type: string;      // p.ej. 'stockLow', 'ventaCreada'
  payload: any;      // datos específicos
}

@Injectable()
export class NotificacionesService {
  private events$ = new Subject<NotificationEvent>();

  /**
   * Emitir un nuevo evento a todos los SSE suscriptores
   */
  sendEvent(event: NotificationEvent) {
    this.events$.next(event);
  }

  /**
   * Permite al controlador suscribirse como Observable
   */
  onEvent(): Observable<NotificationEvent> {
    return this.events$.asObservable();
  }
}
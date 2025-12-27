import { Controller, Sse } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { NotificacionesService } from './notificaciones.service';

@Controller('notifications')
export class NotificacionesController {
  constructor(private readonly notificationsService: NotificacionesService) { }

  @Sse('stream')
  stream(): Observable<any> {
    return this.notificationsService.onEvent().pipe(
      map(evt => ({
        id: undefined,
        event: evt.type,
        data: JSON.stringify(evt.payload),
      })),
    );
  }
}
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { Observable } from "rxjs";

@Injectable()
export class BasicAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean  {
        const request: Request = context.switchToHttp().getRequest();

        const authHeader = request.headers['authorization'];

        if(!authHeader || !authHeader.startsWith('Basic')){
            throw new UnauthorizedException('Falta encabezado de autorización');
        }

        //Extraer y decodificar
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [username, password] = credentials.split(':');

        //Validación simple
        if(username !== 'admin' || password !== 'Items@123**'){
            throw new UnauthorizedException('Credenciales invalidas');
        }
        return true;
    }
}
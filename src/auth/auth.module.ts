import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ControlModule } from 'src/control/control.module';

@Module({
  controllers: [AuthController],
  providers: [AuthService,JwtStrategy],
  imports: [
    ConfigModule,
    ControlModule,
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService:ConfigService) => {

        return {
          secret: configService.get('JWT_SECRET'),
          signOptions: {
            expiresIn: '8h'
          }
        }
      }
    })

  ],
  exports:[TypeOrmModule,JwtStrategy,PassportModule,JwtModule,AuthService]

})
export class AuthModule {}

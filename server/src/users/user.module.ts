import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { EmailModule } from 'src/email/email.module';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    EmailModule,
    PassportModule.register({ defaultStrategy: 'google' }),
  ],
  controllers: [UserController],
  providers: [UserService, GoogleStrategy],
  exports: [UserService],
})
export class UserModule { }

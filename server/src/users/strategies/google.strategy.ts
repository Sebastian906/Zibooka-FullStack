import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(configService: ConfigService) {
        super({
            clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
            clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
            callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL', 'http://localhost:4000/api/user/google/callback'),
            scope: ['email', 'profile'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ): Promise<void> {
        const { id, emails, displayName, photos } = profile;

        if (!emails || emails.length === 0) {
            return done(new UnauthorizedException('No email found from Google account'), false);
        }

        const googleUser = {
            googleId: id,
            email: emails[0].value,
            name: displayName || emails[0].value.split('@')[0],
            profileImage: photos && photos.length > 0 ? photos[0].value : null,
        };

        done(null, googleUser);
    }
}
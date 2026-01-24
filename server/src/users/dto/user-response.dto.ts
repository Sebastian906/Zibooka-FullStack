import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
    @ApiProperty({ example: 'user@example.com' })
    email: string;

    @ApiProperty({ example: 'John Doe' })
    name: string;

    @ApiProperty({ example: 'https://example.com/profile-image.jpg' })
    profileImage: string;
}
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateAddressDto {
    @ApiProperty({
        example: 'John',
        description: 'First name',
    })
    @IsNotEmpty()
    @IsString()
    firstName: string;

    @ApiProperty({
        example: 'Doe',
        description: 'Last name',
    })
    @IsNotEmpty()
    @IsString()
    lastName: string;

    @ApiProperty({
        example: 'john@example.com',
        description: 'Email address',
    })
    @IsNotEmpty()
    @IsEmail({}, { message: 'Please enter a valid email' })
    email: string;

    @ApiProperty({
        example: '123 Main Street',
        description: 'Street address',
    })
    @IsNotEmpty()
    @IsString()
    street: string;

    @ApiProperty({
        example: 'New York',
        description: 'City',
    })
    @IsNotEmpty()
    @IsString()
    city: string;

    @ApiProperty({
        example: 'NY',
        description: 'State',
    })
    @IsNotEmpty()
    @IsString()
    state: string;

    @ApiProperty({
        example: 'United States',
        description: 'Country',
    })
    @IsNotEmpty()
    @IsString()
    country: string;

    @ApiProperty({
        example: '10001',
        description: 'Zipcode',
    })
    @IsNotEmpty()
    @IsString()
    zipcode: string;

    @ApiProperty({
        example: '+1234567890',
        description: 'Phone number',
    })
    @IsNotEmpty()
    @IsString()
    phone: string;
}
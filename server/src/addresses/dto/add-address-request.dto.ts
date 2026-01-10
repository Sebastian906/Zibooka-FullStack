import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CreateAddressDto } from './create-address.dto';

export class AddAddressRequestDto {
    @ApiProperty({
        description: 'Address object',
        type: CreateAddressDto,
    })
    @ValidateNested()
    @Type(() => CreateAddressDto)
    address: CreateAddressDto;
}
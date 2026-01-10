import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Address, AddressDocument } from './schemas/address.schema';
import { Model } from 'mongoose';
import { CreateAddressDto } from '../addresses/dto/create-address.dto';

@Injectable()
export class AddressService {
    constructor(
        @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
    ) { }

    async addAddress(
        userId: string,
        createAddressDto: CreateAddressDto,
    ): Promise<{ message: string }> {
        try {
            await this.addressModel.create({
                ...createAddressDto,
                userId,
            });

            return { message: 'Address created successfully' };
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }

    async getAddresses(userId: string): Promise<Address[]> {
        try {
            const addresses = await this.addressModel.find({ userId });
            return addresses;
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }
}
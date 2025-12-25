import React from 'react'

const ProductDescription = () => {
    return (
        <div className='mt-14 ring-1 ring-state-900/10 rounded-lg'>
            <div className="flex gap-3">
                <button className='medium-14 p-3 w-32 border-b-2 border-secondary'>Description</button>
                <button className='medium-14 p-3 w-32'>Color Guide</button>
                <button className='medium-14 p-3 w-32'>Size Guide</button>
            </div>
            <hr className='h-px w-full border-gray-500/30' />
            <div className='flex flex-col gap-3 p-3'>
                <div>
                    <h5 className='h5'>Derail</h5>
                    <p className="text-sm">
                        Lorem ipsum dolor, sit amet consectetur adipisicing elit. Praesentium, sunt! Qui, culpa sunt ullam temporibus perferendis recusandae rem natus minus ipsam porro necessitatibus at, quaerat ex beatae aliquid facilis magnam.
                    </p>
                    <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Inventore modi aut ipsa sequi repellendus fuga.</p>
                </div>
                <div>
                    <h5 className="h5">Benefit</h5>
                    <ul className="list-disc pl-5 text-sm flex flex-col gap-1">
                        <li className='text-gray-50'>High-quality materials ensure long-lasting durability and comfort.</li>
                        <li className='text-gray-50'>Desgined to meet the needs of modern, active lifestyles.</li>
                        <li className='text-gray-50'>Available in a wide range of colors and trendy colors.</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default ProductDescription
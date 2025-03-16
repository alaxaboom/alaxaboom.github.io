import React, { useState } from 'react';
import supabase from './supabase';

const CreateElement = () => {
    const [text, setText] = useState('');
    const [image, setImage] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (image) {
            // Загружаем изображение в Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(`public/${image.name}`, image);

            if (uploadError) {
                console.error('Ошибка загрузки изображения:', uploadError.message);
                return;
            }

            // Получаем URL изображения
            const imageUrl = supabase.storage
                .from('images')
                .getPublicUrl(`public/${image.name}`).data.publicUrl;

            // Добавляем элемент в таблицу tierListItems
            const { error } = await supabase
                .from('tierListItems')
                .insert([
                    { text, image_url: imageUrl },
                ]);

            if (error) {
                console.error('Ошибка добавления элемента:', error.message);
                return;
            }

            console.log("Элемент успешно добавлен");

            setText('');
            setImage(null);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Введите текст"
            />
            <input
                type="file"
                onChange={(e) => setImage(e.target.files[0])}
                accept="image/*"
            />
            <button type="submit">Создать элемент</button>
        </form>
    );
};

export default CreateElement;
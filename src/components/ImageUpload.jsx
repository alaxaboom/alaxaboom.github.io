import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Импортируем UUID generator
import supabase from '../supabase'; // Импортируем Supabase клиент
import '../css/ImageUpload.css'; // Импортируем стили (или styles из CSS-модуля)

const ImageUpload = ({ onImageUpload }) => {
  const [image, setImage] = useState(null); // Состояние для выбранного файла
  const [loading, setLoading] = useState(false); // Состояние для отображения загрузки

  // Функция для транслитерации русских символов
  const transliterate = (text) => {
    const rus = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
    const lat = "abvgdeejzijklmnoprstufhzcss_y_eua";

    return text
      .toLowerCase()
      .split("")
      .map((char) => {
        const index = rus.indexOf(char);
        return index >= 0 ? lat[index] : char;
      })
      .join("")
      .replace(/[^a-zA-Z0-9._-]/g, "_") // Заменяем недопустимые символы на "_"
      .replace(/\s+/g, "_"); // Заменяем пробелы на "_"
  };

  // Обработчик изменения файла
  const handleImageChange = (e) => {
    const selectedImage = e.target.files[0];
    setImage(selectedImage);
  };

  // Обработчик загрузки файла
  const handleUpload = async () => {
    if (image) {
      setLoading(true); // Включаем состояние загрузки

      // Генерируем уникальный идентификатор
      const uniqueId = uuidv4();

      // Транслитерируем имя файла
      const sanitizedFileName = `${uniqueId}_${transliterate(image.name)}`;

      try {
        // Загружаем файл в Supabase Storage
        const {  error } = await supabase.storage
          .from('images') // Указываем bucket (папку)
          .upload(`public/${sanitizedFileName}`, image); // Указываем путь и файл

        if (error) {
          throw error;
        }

        // Получаем публичный URL загруженного файла
        const imageUrl = supabase.storage
          .from('images')
          .getPublicUrl(`public/${sanitizedFileName}`).data.publicUrl;

        // Передаем URL файла в родительский компонент
        onImageUpload(imageUrl);

        // Сбрасываем состояние
        setImage(null);
      } catch (error) {
        console.error('Ошибка загрузки изображения:', error.message);
      } finally {
        setLoading(false); // Выключаем состояние загрузки
      }
    }
  };

  return (
    <div className="image-upload">
      <input
        type="file"
        accept="image/*" // Разрешаем только изображения
        onChange={handleImageChange}
        disabled={loading} // Блокируем input во время загрузки
      />
      <button className="upload-button" onClick={handleUpload} disabled={!image || loading}>
        {loading ? 'Загрузка...' : 'Загрузить изображение'}
      </button>
    </div>
  );
};

export default ImageUpload;
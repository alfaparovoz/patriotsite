document.addEventListener('DOMContentLoaded', function() {
    // Заполняем года (от текущего до 1900)
    const yearSelect = document.querySelector('select[name="year"]');
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1900; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }

    // Заполняем дни (1-31)
    const daySelect = document.querySelector('select[name="day"]');
    for (let day = 1; day <= 31; day++) {
        const option = document.createElement('option');
        option.value = day;
        option.textContent = day;
        daySelect.appendChild(option);
    }

    // Обработчик изменения месяца
    const monthSelect = document.querySelector('select[name="month"]');
    monthSelect.addEventListener('change', updateDays);
    yearSelect.addEventListener('change', updateDays);

    function updateDays() {
        const selectedMonth = parseInt(monthSelect.value);
        const selectedYear = parseInt(yearSelect.value);
        let daysInMonth;

        if (selectedMonth === 2) {
            // Проверка на високосный год для февраля
            daysInMonth = ((selectedYear % 4 === 0 && selectedYear % 100 !== 0) || selectedYear % 400 === 0) ? 29 : 28;
        } else if ([4, 6, 9, 11].includes(selectedMonth)) {
            daysInMonth = 30;
        } else {
            daysInMonth = 31;
        }

        const daySelect = document.querySelector('select[name="day"]');
        const currentDay = parseInt(daySelect.value);
        
        // Сохраняем выбранный день, если он есть
        daySelect.innerHTML = '';
        
        for (let day = 1; day <= daysInMonth; day++) {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = day;
            if (day === currentDay && day <= daysInMonth) {
                option.selected = true;
            }
            daySelect.appendChild(option);
        }
    }
    document.forms.signup.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(this); // Для загрузки файлов
        
        try {
            const response = await fetch('/registration', {
                method: 'POST',
                body: formData, // FormData автоматически устанавливает Content-Type
                credentials: 'include' // Передача куки
            });

            if (response.ok) {
                window.location.href = '/profile';
            } else {
                alert('Ошибка регистрации: ' + await response.text());
            }
        } catch (err) {
            alert('Ошибка сети');
        }
    });
});

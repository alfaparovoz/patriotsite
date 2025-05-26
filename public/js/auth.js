document.addEventListener('DOMContentLoaded', async () => {
    window.userIsAdmin = false; // Глобальная переменная
    const updateAuthSection = async () => 
    {
        const authSection = document.getElementById('auth-section');
        if (!authSection) return;

        try {
            const response = await fetch('/api/user', { credentials: 'include' });
            if (response.ok) {
                const user = await response.json();
                window.userIsAdmin = user.status === 'admin'; 
                authSection.innerHTML = `
                    <a href="/profile">${user.username}</a>
                    <a href="/logout">Выйти</a>
                `;
            } else {
                authSection.innerHTML = '<a href="/login">Вход</a>';
            }
        } catch (err) {
            console.error('Ошибка проверки авторизации:', err);
            authSection.innerHTML = '<a href="/login">Вход</a>';
        }
    };

    await updateAuthSection();
});
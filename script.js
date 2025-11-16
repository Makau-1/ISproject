class UserManager {
    constructor() {
        this.baseURL = 'http://localhost:5000';
        this.initEventListeners();
    }

    initEventListeners() {
        // Form submission
        document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.registerUser();
        });

        // Load users button
        document.getElementById('loadUsers').addEventListener('click', () => {
            this.loadUsers();
        });

        // Real-time validation on input fields
        document.getElementById('username').addEventListener('input', (e) => {
            this.validateField('username', e.target.value);
        });

        document.getElementById('password').addEventListener('input', (e) => {
            this.validateField('password', e.target.value);
        });
    }

    validateField(fieldName, value) {
        const field = document.getElementById(fieldName);
        const errorSpan = document.getElementById(`${fieldName}Error`) || this.createErrorSpan(fieldName);
        
        // Clear previous styling
        field.classList.remove('error', 'success');
        errorSpan.textContent = '';

        let isValid = true;
        let errorMessage = '';

        switch(fieldName) {
            case 'username':
                if (value.length === 0) {
                    isValid = true; // No error if empty
                } else if (value.length < 3) {
                    isValid = false;
                    errorMessage = 'Username must be at least 3 characters long';
                } else if (value.length > 30) {
                    isValid = false;
                    errorMessage = 'Username cannot exceed 30 characters';
                } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                    isValid = false;
                    errorMessage = 'Username can only contain letters, numbers, and underscores';
                } else if (!/^[a-zA-Z]/.test(value)) {
                    isValid = false;
                    errorMessage = 'Username must start with a letter';
                }
                break;

            case 'password':
                if (value.length === 0) {
                    isValid = true; // No error if empty
                } else if (value.length < 6) {
                    isValid = false;
                    errorMessage = 'Password must be at least 6 characters long';
                } else if (value.length > 100) {
                    isValid = false;
                    errorMessage = 'Password cannot exceed 100 characters';
                } else if (!/(?=.*[a-z])/.test(value)) {
                    isValid = false;
                    errorMessage = 'Password must contain at least one lowercase letter';
                } else if (!/(?=.*[A-Z])/.test(value)) {
                    isValid = false;
                    errorMessage = 'Password must contain at least one uppercase letter';
                } else if (!/(?=.*\d)/.test(value)) {
                    isValid = false;
                    errorMessage = 'Password must contain at least one number';
                } else if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(value)) {
                    isValid = false;
                    errorMessage = 'Password must contain at least one special character';
                } else if (/(.)\1\1/.test(value)) {
                    isValid = false;
                    errorMessage = 'Password cannot contain three identical characters in a row';
                }
                break;
        }

        // Apply styling and show error message
        if (!isValid && value.length > 0) {
            field.classList.add('error');
            errorMessage && (errorSpan.textContent = errorMessage);
        } else if (isValid && value.length > 0) {
            field.classList.add('success');
        }

        return isValid;
    }

    createErrorSpan(fieldName) {
        const field = document.getElementById(fieldName);
        const errorSpan = document.createElement('span');
        errorSpan.id = `${fieldName}Error`;
        errorSpan.className = 'error-message';
        field.parentNode.appendChild(errorSpan);
        return errorSpan;
    }

    validateForm() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Clear previous messages
        this.clearValidationMessages();

        let isValid = true;
        let errorMessages = [];

        // Username validation
        if (!username) {
            isValid = false;
            errorMessages.push('Username is required');
            document.getElementById('username').classList.add('error');
        } else if (username.length < 3) {
            isValid = false;
            errorMessages.push('Username must be at least 3 characters long');
            document.getElementById('username').classList.add('error');
        } else if (username.length > 30) {
            isValid = false;
            errorMessages.push('Username cannot exceed 30 characters');
            document.getElementById('username').classList.add('error');
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            isValid = false;
            errorMessages.push('Username can only contain letters, numbers, and underscores');
            document.getElementById('username').classList.add('error');
        } else if (!/^[a-zA-Z]/.test(username)) {
            isValid = false;
            errorMessages.push('Username must start with a letter');
            document.getElementById('username').classList.add('error');
        }

        // Password validation
        if (!password) {
            isValid = false;
            errorMessages.push('Password is required');
            document.getElementById('password').classList.add('error');
        } else if (password.length < 6) {
            isValid = false;
            errorMessages.push('Password must be at least 6 characters long');
            document.getElementById('password').classList.add('error');
        } else if (password.length > 100) {
            isValid = false;
            errorMessages.push('Password cannot exceed 100 characters');
            document.getElementById('password').classList.add('error');
        } else if (!/(?=.*[a-z])/.test(password)) {
            isValid = false;
            errorMessages.push('Password must contain at least one lowercase letter');
            document.getElementById('password').classList.add('error');
        } else if (!/(?=.*[A-Z])/.test(password)) {
            isValid = false;
            errorMessages.push('Password must contain at least one uppercase letter');
            document.getElementById('password').classList.add('error');
        } else if (!/(?=.*\d)/.test(password)) {
            isValid = false;
            errorMessages.push('Password must contain at least one number');
            document.getElementById('password').classList.add('error');
        } else if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
            isValid = false;
            errorMessages.push('Password must contain at least one special character');
            document.getElementById('password').classList.add('error');
        } else if (/(.)\1\1/.test(password)) {
            isValid = false;
            errorMessages.push('Password cannot contain three identical characters in a row');
            document.getElementById('password').classList.add('error');
        }

        // Show all error messages
        if (errorMessages.length > 0) {
            this.showMessage(errorMessages.join('<br>'), 'error');
        }

        return isValid;
    }

    clearValidationMessages() {
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.textContent = '');
        
        const fields = document.querySelectorAll('input');
        fields.forEach(field => {
            field.classList.remove('error', 'success');
        });
    }

    async registerUser() {
        // Validate form before submission
        if (!this.validateForm()) {
            return;
        }

        const formData = new FormData(document.getElementById('userForm'));
        const userData = {
            username: formData.get('username').trim(),
            password: formData.get('password')
        };

        try {
            const response = await fetch(`${this.baseURL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                this.showMessage('User registered successfully!', 'success');
                document.getElementById('userForm').reset();
                this.clearValidationMessages();
                this.loadUsers(); // Refresh the users list
            } else {
                const error = await response.json();
                this.showMessage(`Error: ${error.message}`, 'error');
            }
        } catch (error) {
            this.showMessage('Network error: Could not connect to server', 'error');
            console.error('Error:', error);
        }
    }

    async loadUsers() {
        try {
            const response = await fetch(`${this.baseURL}/api/users`);
            
            if (response.ok) {
                const users = await response.json();
                this.displayUsers(users);
                this.showMessage(`Loaded ${users.length} users`, 'success');
            } else {
                this.showMessage('Error loading users', 'error');
            }
        } catch (error) {
            this.showMessage('Network error: Could not connect to server', 'error');
            console.error('Error:', error);
        }
    }

    displayUsers(users) {
        const usersList = document.getElementById('usersList');
        
        if (users.length === 0) {
            usersList.innerHTML = '<p class="no-users">No users registered yet.</p>';
            return;
        }

        usersList.innerHTML = users.map(user => `
            <div class="user-item">
                <strong>ID:</strong> ${user.id}<br>
                <strong>Username:</strong> ${user.username}<br>
                <strong>Registered:</strong> ${new Date(user.createdAt).toLocaleDateString()}
            </div>
        `).join('');
    }

    showMessage(message, type) {
        const messageEl = document.getElementById('message');
        messageEl.innerHTML = message; // Use innerHTML to support <br> tags
        messageEl.className = `message ${type}`;
        
        // Hide message after 5 seconds
        setTimeout(() => {
            messageEl.className = 'message hidden';
        }, 5000);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new UserManager();
});
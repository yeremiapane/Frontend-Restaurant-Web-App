import { api } from '../utils/api.js';

export class ProfileManager {
    constructor() {
        this.initializeTabs();
        this.initializePasswordToggles();
        this.initializeImageUploads();
        this.loadProfile();
    }

    async loadProfile() {
        try {
            const response = await api.fetchWithAuth('/profile');
            const profile = response.data;
            this.updateProfileUI(profile);
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    updateProfileUI(profile) {
        // Update avatar
        const avatar = document.querySelector('.profile-avatar img');
        if (avatar && profile.avatar_url) {
            avatar.src = profile.avatar_url;
        }

        // Update cover
        const cover = document.querySelector('.profile-cover');
        if (cover && profile.cover_url) {
            cover.style.backgroundImage = `url(${profile.cover_url})`;
        }

        // Update profile info
        document.getElementById('profileName').textContent = profile.name;
        document.getElementById('profileEmail').textContent = profile.email;
        document.getElementById('profileRole').textContent = profile.role;
    }

    initializeTabs() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                // Remove active class from all tabs and links
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));

                // Add active class to clicked link and corresponding tab
                link.classList.add('active');
                const tabId = link.dataset.tab;
                document.getElementById(tabId).classList.add('active');
            });
        });
    }

    initializePasswordToggles() {
        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', (e) => {
                const input = e.target.closest('.password-input').querySelector('input');
                const icon = e.target.querySelector('i');

                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    }

    initializeImageUploads() {
        const handleImageUpload = (input, imageElement) => {
            const file = input.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imageElement.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        };

        // Avatar upload
        const avatarInput = document.createElement('input');
        avatarInput.type = 'file';
        avatarInput.accept = 'image/*';
        avatarInput.style.display = 'none';
        document.body.appendChild(avatarInput);

        document.querySelector('.edit-avatar')?.addEventListener('click', () => {
            avatarInput.click();
        });

        avatarInput.addEventListener('change', (e) => {
            const profileImage = document.querySelector('.profile-avatar img');
            handleImageUpload(e.target, profileImage);
        });

        // Cover upload
        const coverInput = document.createElement('input');
        coverInput.type = 'file';
        coverInput.accept = 'image/*';
        coverInput.style.display = 'none';
        document.body.appendChild(coverInput);

        document.querySelector('.edit-cover')?.addEventListener('click', () => {
            coverInput.click();
        });

        coverInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.querySelector('.profile-cover').style.backgroundImage = `url(${e.target.result})`;
                };
                reader.readAsDataURL(file);
            }
        });
    }
} 
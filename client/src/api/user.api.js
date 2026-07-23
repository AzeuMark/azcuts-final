import api from '../config/axios';

const unwrap = (p) => p.then((r) => r.data);

export const userApi = {
  updateProfile: (payload) => unwrap(api.put('/users/profile', payload)),
  changePassword: (payload) => unwrap(api.put('/users/password', payload)),
  setTheme: (theme) => unwrap(api.put('/users/theme', { theme })),
  // Set the avatar to an external image URL (instead of uploading a file).
  setAvatarUrl: (url) => unwrap(api.put('/users/profile', { avatar: url })),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('file', file);
    return unwrap(
      api.post('/users/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  },
};

export default userApi;

import { useToastStore } from '../store/useToastStore';

export const useToast = () => {
  const addToast = useToastStore((state) => state.addToast);

  return {
    success: (title: string, message?: string) => addToast('success', title, message),
    error: (title: string, message?: string) => addToast('error', title, message),
    info: (title: string, message?: string) => addToast('info', title, message),
  };
};
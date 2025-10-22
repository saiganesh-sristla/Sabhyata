import React, { createContext, useContext, useRef, useState } from 'react';

type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
};

type ConfirmContextType = {
  confirm: (opts?: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({});
  const resolveRef = useRef<(value: boolean) => void>();

  const confirm = (options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setOpts(options);
      resolveRef.current = resolve;
      setOpen(true);
    });
  };

  const close = (value: boolean) => {
    setOpen(false);
    if (resolveRef.current) {
      resolveRef.current(value);
    }
    resolveRef.current = undefined;
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-30" onClick={() => close(false)} />
          <div className="bg-white rounded-lg shadow-lg z-10 max-w-lg w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900">{opts.title || 'Please confirm'}</h3>
              {opts.description && <p className="mt-2 text-sm text-gray-600">{opts.description}</p>}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50"
                  onClick={() => close(false)}
                >
                  {opts.cancelText || 'Cancel'}
                </button>
                <button
                  className="px-4 py-2 rounded-md bg-[#982A3D] text-white text-sm hover:opacity-90"
                  onClick={() => close(true)}
                >
                  {opts.confirmText || 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx.confirm;
};

export default ConfirmProvider;

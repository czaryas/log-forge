import React, { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client'


interface UploadResponse {
    jobId: string,
    message: string
}

interface LogUploaderProps {
    onUploadSuccess?: (jobId: string) => void;
  }

const LogUploader: React.FC<LogUploaderProps> = ({ onUploadSuccess }) => {
    const inoutFileRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const supabase = createClient()

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        console.log('handleFileSelect called ')
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            // Optional: Add file size limit (e.g., 1GB)
            if (selectedFile.size > 1024 * 1024 * 1024) {
                toast.error('File size exceeds 1GB limit');
                return;
            }
            setFile(selectedFile);
        }
    }

    const handleUpload = useCallback( async(event:any)=>{
        if(!file){
            toast.error('No file selected');
            return;
        }
        setIsUploading(true);
        try{
            const { data: {session}} = await supabase.auth.getSession();
            if(!session){
                toast.error('Please log in to upload files');
                setIsUploading(false);
                return;
            }
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('/api/upload-logs',{
                method: 'POST',
                headers:{
                    'Authorization': `Bearer {session.access_token}`
                },
                body: formData
            })
            if(!response.ok){
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed')
            }
            const result: UploadResponse = await response.json();
            onUploadSuccess?.(result.jobId);
            // toast.success(result.message);
            setIsUploading(false);
            if(inoutFileRef.current){
                inoutFileRef.current.value = '';
                console.log('event', event)
            }            
            setFile(null);

        }catch(error){
            console.error('Upload error:', error);
            toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
        }finally{
            setIsUploading(false);
        }

    },[file, supabase, onUploadSuccess])

    return(
        <div className='flex flex-col items-center space-y-4'>
            <div className="flex items-center space-x-4">
                <input 
                    ref={inoutFileRef}
                    type='file' 
                    accept='.log,.txt'
                    onChange={handleFileSelect}
                    className="file:mr-4 file:rounded-full file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-violet-100"
                />
                { file && (
                    <span className="text-sm text-gray-600">
                        {file.name} ({Math.round(file.size / 1024)} KB)
                    </span>
                )}
            </div>
            <button 
                onClick={handleUpload}
                disabled={!file}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
                {isUploading ? 'Uploading...' : 'Upload Log File'}
            </button>
        </div>
    )
}


export default LogUploader;

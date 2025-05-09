import type { Attachment } from 'ai';
import {
  FileTextIcon,
  FileIcon,
  TableIcon,
  ImageIcon,
  LoaderIcon,
} from 'lucide-react';

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
}: {
  attachment: Attachment;
  isUploading?: boolean;
}) => {
  const { name, url, contentType } = attachment;

  const getFileIcon = () => {
    if (!contentType) return <FileIcon className="size-6 text-zinc-500" />;

    if (contentType.startsWith('image')) {
      return <ImageIcon className="size-6 text-zinc-500" />;
    } else if (contentType === 'application/pdf') {
      return <FileIcon className="size-6 text-red-500" />;
    } else if (contentType === 'text/plain') {
      return <FileTextIcon className="size-6 text-blue-500" />;
    } else if (contentType === 'text/csv') {
      return <TableIcon className="size-6 text-green-500" />;
    } else {
      return <FileIcon className="size-6 text-zinc-500" />;
    }
  };

  return (
    <div data-testid="input-attachment-preview" className="flex flex-col gap-2">
      <div className="w-20 h-16 aspect-video bg-muted rounded-md relative flex flex-col items-center justify-center">
        {contentType?.startsWith('image') ? (
          // NOTE: it is recommended to use next/image for images
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt={name ?? 'An image attachment'}
            className="rounded-md size-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center">
            {getFileIcon()}
          </div>
        )}

        {isUploading && (
          <div
            data-testid="input-attachment-loader"
            className="animate-spin absolute text-zinc-500"
          >
            <LoaderIcon />
          </div>
        )}
      </div>
      <div className="text-xs text-zinc-500 max-w-16 truncate">{name}</div>
    </div>
  );
};

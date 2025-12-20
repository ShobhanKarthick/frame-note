export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
}

// Storing the full Fabric JSON object
export interface DrawingPath {
  version: string;
  objects: any[]; 
}

export interface Annotation {
  id: string;
  videoId: string;
  startTime: number; // Start of the annotation (seconds)
  endTime: number;   // End of the annotation (seconds). Equals startTime for point comments.
  author: User;
  text: string;
  createdAt: number;
  type: 'comment' | 'drawing';
  drawingData?: DrawingPath;
  attachments: Attachment[];
}

export interface VideoMetadata {
  id: string;
  name: string;
  url: string;
  duration: number;
}
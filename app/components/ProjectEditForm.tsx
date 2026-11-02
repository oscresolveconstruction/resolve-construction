'use client';
import {useState} from 'react';
import {updateProject} from '../actions/projects';

export default function ProjectEditForm({children,className}:{children:React.ReactNode;className?:string}) {
 const [error,setError]=useState('');
 return <form className={className} action={async data=>{
  setError('');
  try {const result=await updateProject(data);if(result?.error)setError(result.error);}
  catch {setError('Could not save the project. Please try again.');}
 }}>{error&&<p role="alert" className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}{children}</form>;
}

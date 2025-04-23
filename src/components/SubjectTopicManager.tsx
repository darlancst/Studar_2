'use client';

import { useState } from 'react';
import { XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { Subject, Topic } from '@/types';

interface SubjectTopicManagerProps {
  onClose: () => void;
}

export default function SubjectTopicManager({ onClose }: SubjectTopicManagerProps) {
  const [activeTab, setActiveTab] = useState<'subjects' | 'topics'>('subjects');
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  
  // Formulários
  const [subjectName, setSubjectName] = useState('');
  const [subjectColor, setSubjectColor] = useState('#3B82F6');
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [topicSubjectId, setTopicSubjectId] = useState('');
  
  const { subjects, addSubject, updateSubject, deleteSubject } = useSubjectStore();
  const { topics, addTopic, updateTopic, deleteTopic } = useTopicStore();
  
  // Colors para matérias
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#F97316', '#6366F1'
  ];
  
  // Manipuladores de formulário
  const handleSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubject) {
      updateSubject(editingSubject.id, { name: subjectName, color: subjectColor });
      setEditingSubject(null);
    } else {
      addSubject(subjectName, subjectColor);
    }
    setSubjectName('');
    setSubjectColor('#3B82F6');
  };
  
  const handleTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTopic) {
      updateTopic(editingTopic.id, { 
        title: topicTitle, 
        description: topicDescription,
        subjectId: topicSubjectId 
      });
      setEditingTopic(null);
    } else {
      addTopic(topicTitle, topicSubjectId, topicDescription);
    }
    setTopicTitle('');
    setTopicDescription('');
    setTopicSubjectId(subjects[0]?.id || '');
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-gray-700 bg-opacity-50 dark:bg-black dark:bg-opacity-60 overflow-y-auto flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl m-4">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold dark:text-white">Gerenciar Matérias e Tópicos</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex border-b dark:border-gray-700">
          <button
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'subjects'
                ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('subjects')}
          >
            Matérias
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'topics'
                ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('topics')}
          >
            Tópicos
          </button>
        </div>
        
        <div className="p-6">
          {activeTab === 'subjects' && (
            <>
              <form onSubmit={handleSubjectSubmit} className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome da Matéria
                    </label>
                    <input
                      type="text"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Ex: Matemática"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cor
                    </label>
                    <div className="subject-colors">
                      {colors.map((color) => (
                        <div
                          key={color}
                          className={`color-option ${subjectColor === color ? 'selected' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setSubjectColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium"
                  >
                    {editingSubject ? 'Atualizar Matéria' : 'Adicionar Matéria'}
                  </button>
                </div>
              </form>
              
              <h3 className="font-medium mb-2 dark:text-white">Matérias</h3>
              <div className="space-y-2">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: subject.color }}
                      />
                      <span className="dark:text-white">{subject.name}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingSubject(subject);
                          setSubjectName(subject.name);
                          setSubjectColor(subject.color);
                        }}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteSubject(subject.id)}
                        className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {activeTab === 'topics' && (
            <>
              <form onSubmit={handleTopicSubmit} className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Título do Tópico
                    </label>
                    <input
                      type="text"
                      value={topicTitle}
                      onChange={(e) => setTopicTitle(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Ex: Equações de 2º Grau"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Matéria
                    </label>
                    <select
                      value={topicSubjectId}
                      onChange={(e) => setTopicSubjectId(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    >
                      <option value="">Selecione uma matéria</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={topicDescription}
                    onChange={(e) => setTopicDescription(e.target.value)}
                    rows={3}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Descreva o conteúdo deste tópico..."
                  />
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={subjects.length === 0}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      subjects.length === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    {editingTopic ? 'Atualizar Tópico' : 'Adicionar Tópico'}
                  </button>
                </div>
              </form>
              
              <h3 className="font-medium mb-2 dark:text-white">Tópicos</h3>
              <div className="space-y-2">
                {topics.map((topic) => {
                  const subject = subjects.find((s) => s.id === topic.subjectId);
                  return (
                    <div
                      key={topic.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div>
                        <div className="flex items-center">
                          {subject && (
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: subject.color }}
                            />
                          )}
                          <span className="font-medium dark:text-white">{topic.title}</span>
                        </div>
                        {topic.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {topic.description}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingTopic(topic);
                            setTopicTitle(topic.title);
                            setTopicDescription(topic.description || '');
                            setTopicSubjectId(topic.subjectId);
                          }}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deleteTopic(topic.id)}
                          className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 
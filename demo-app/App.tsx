import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Animated, Modal, Alert, Image, Dimensions, Platform, Pressable, Share } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import DraggableGrid from 'react-native-draggable-grid';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Task {
  id: string;
  title: string;
  content?: string;
  completed: boolean;
  audioUris: string[];
  imageUris: string[];
  links: {
    url: string;
    type: 'website' | 'location';
    title?: string;
    thumbnail?: string;
  }[];
  createdAt: Date;
  key: string;
}

const COLORS = {
  primary: '#FFB340',
  secondary: '#FFB340',
  accent: '#FF2D55',
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#8E8E93',
  border: '#C6C6C8',
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FFCC00',
  gradientStart: '#FFB340',
  gradientEnd: '#FF9500',
  modalBackground: '#FFFFFF'
};

const AudioVisualizer = () => {
  const [heights, setHeights] = useState<Animated.Value[]>(
    [...Array(30)].map(() => new Animated.Value(5))
  );
  
  useEffect(() => {
    const animate = () => {
      const animations = heights.map((height) => {
        const randomHeight = Math.random() * 25 + 5;
        return Animated.sequence([
          Animated.timing(height, {
            toValue: randomHeight,
            duration: 600,
            useNativeDriver: false,
          }),
          Animated.timing(height, {
            toValue: 5,
            duration: 600,
            useNativeDriver: false,
          }),
        ]);
      });
      
      Animated.stagger(30, animations).start(() => animate());
    };
    
    animate();
    return () => heights.forEach(height => height.stopAnimation());
  }, []);

  return (
    <View style={styles.audioVisualizerContainer}>
      {heights.map((height, i) => (
        <Animated.View
          key={i}
          style={[
            styles.audioBar,
            { 
              height,
              backgroundColor: i % 2 === 0 ? COLORS.gradientStart : COLORS.gradientEnd
            }
          ]}
        />
      ))}
    </View>
  );
};

const groupTasksByDate = (tasks: Task[]) => {
  const groups: { [key: string]: Task[] } = {
    "Aujourd'hui": [],
    "7 jours précédents": [],
    "30 jours précédents": [],
    "Plus ancien": []
  };

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  tasks.forEach(task => {
    const taskDate = new Date(task.createdAt);
    if (taskDate.toDateString() === now.toDateString()) {
      groups["Aujourd'hui"].push(task);
    } else if (taskDate >= sevenDaysAgo) {
      groups["7 jours précédents"].push(task);
    } else if (taskDate >= thirtyDaysAgo) {
      groups["30 jours précédents"].push(task);
    } else {
      groups["Plus ancien"].push(task);
    }
  });

  return groups;
};

const formatDate = (date: Date) => {
  const today = new Date();
  const taskDate = new Date(date);
  
  if (taskDate.toDateString() === today.toDateString()) {
    return taskDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  
  return taskDate.toLocaleDateString('fr-FR', { 
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const App = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const [animationValues, setAnimationValues] = useState<{ [key: string]: Animated.Value }>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [currentPlayingUri, setCurrentPlayingUri] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    saveTasks();
  }, [tasks]);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', "L'accès à la galerie est nécessaire pour cette fonctionnalité");
      }
    })();
  }, []);

  const loadTasks = async () => {
    try {
      const savedTasks = await AsyncStorage.getItem('tasks');
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        const tasksWithDates = parsedTasks.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt)
        }));
        setTasks(tasksWithDates);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notes:', error);
    }
  };

  const saveTasks = async () => {
    try {
      await AsyncStorage.setItem('tasks', JSON.stringify(tasks));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des notes:', error);
    }
  };

  useEffect(() => {
    const newAnimations = { ...animationValues };
    tasks.forEach(task => {
      if (!newAnimations[task.id]) {
        newAnimations[task.id] = new Animated.Value(1);
      }
    });
    setAnimationValues(newAnimations);
  }, [tasks]);

  const onPressIn = (taskId: string) => {
    const anim = animationValues[taskId];
    if (anim) {
      Animated.spring(anim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    }
  };
  
  const onPressOut = (taskId: string) => {
    const anim = animationValues[taskId];
    if (anim) {
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  useEffect(() => {
    if (recording) {
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      setRecordingDuration(0);
    }
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, [recording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const pickImage = async () => {
    if (editingTask && editingTask.imageUris.length >= 5) {
      Alert.alert('Limite atteinte', 'Vous ne pouvez pas ajouter plus de 5 images par note.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "L'accès à la galerie est nécessaire pour cette fonctionnalité");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 1,
      aspect: undefined
    });

    if (!result.canceled && result.assets[0].uri) {
      if (editingTask) {
        setEditingTask({
          ...editingTask,
          imageUris: [...editingTask.imageUris, result.assets[0].uri]
        });
      }
    }
  };

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      Alert.alert('Erreur', "Impossible de démarrer l'enregistrement");
    }
  }

  async function stopRecording() {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      if (editingTask && uri) {
        if (editingTask.audioUris.length >= 5) {
          Alert.alert('Limite atteinte', 'Vous ne pouvez pas ajouter plus de 5 notes vocales par note.');
          return;
        }
        setEditingTask(prev => prev ? {
          ...prev,
          audioUris: [...prev.audioUris, uri]
        } : null);
      }
    } catch (err) {
      Alert.alert('Erreur', "Erreur lors de l'arrêt de l'enregistrement");
    }
  }

  async function playSound(uri: string) {
    try {
      if (sound) {
        if (currentPlayingUri === uri) {
          if (isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            await sound.playAsync();
            setIsPlaying(true);
          }
          return;
        } 
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        setCurrentPlayingUri(null);
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setCurrentPlayingUri(uri);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status && status.didJustFinish) {
          setIsPlaying(false);
          setCurrentPlayingUri(null);
        }
      });
    } catch (err) {
      console.error('Erreur de lecture:', err);
      Alert.alert('Erreur', "Impossible de lire l'enregistrement");
    }
  }

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const addTask = () => {
    if (newTask.trim()) {
      const newId = (tasks.length + 1).toString();
      setTasks([...tasks, { 
        id: newId,
        key: newId,
        title: newTask.trim(), 
        content: '',
        completed: false,
        createdAt: new Date(),
        audioUris: [],
        imageUris: [],
        links: []
      }]);
      setNewTask('');
    }
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, ...updates } : task
    ));
    setIsModalVisible(false);
    setEditingTask(null);
  };

  const deleteTask = (id: string) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setTasks(tasks.filter(task => task.id !== id));
      fadeAnim.setValue(1);
    });
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalVisible(true);
  };

  const deleteImage = (index: number) => {
    if (editingTask) {
      const newImageUris = [...editingTask.imageUris];
      newImageUris.splice(index, 1);
      setEditingTask({ ...editingTask, imageUris: newImageUris });
    }
  };

  const deleteAudio = (index: number) => {
    if (editingTask) {
      const newAudioUris = [...editingTask.audioUris];
      if (currentPlayingUri === newAudioUris[index]) {
        stopAudio();
      }
      newAudioUris.splice(index, 1);
      setEditingTask({ ...editingTask, audioUris: newAudioUris });
    }
  };

  const renderTask = (task: Task) => (
    <Animated.View
      style={[
        styles.taskContainer,
        {
          transform: [{ scale: animationValues[task.id] || new Animated.Value(1) }],
          backgroundColor: COLORS.card,
        },
      ]}
    >
      <TouchableOpacity
        onPressIn={() => onPressIn(task.id)}
        onPressOut={() => onPressOut(task.id)}
        onLongPress={() => setEditingTask(task)}
        style={styles.taskContent}
      >
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <View style={styles.taskActions}>
            {task.audioUris.length > 0 && (
              <View style={styles.audioIndicator}>
                <MaterialIcons name="mic" size={16} color={COLORS.gradientEnd} />
                <Text style={styles.audioText}>{task.audioUris.length}</Text>
              </View>
            )}
            {task.imageUris.length > 0 && (
              <View style={styles.imageIndicator}>
                <MaterialIcons name="image" size={16} color={COLORS.gradientEnd} />
                <Text style={styles.imageText}>{task.imageUris.length}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteTask(task.id)}
            >
              <LinearGradient
                colors={['#FF6B6B', '#FF3B30']}
                style={styles.deleteButtonGradient}
              >
                <MaterialIcons name="delete-outline" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
        
        {task.content && (
          <Text style={styles.taskPreview} numberOfLines={1}>
            {task.content}
          </Text>
        )}

        {task.imageUris.length > 0 && (
          <ScrollView 
            horizontal 
            style={styles.imageScrollView}
            showsHorizontalScrollIndicator={false}
          >
            {task.imageUris.map((uri, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedImage(uri)}
              >
                <Image 
                  source={{ uri }} 
                  style={styles.taskImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  const onDragEnd = (newSortedData: Task[]) => {
    setTasks(newSortedData);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Notes</Text>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Rechercher dans les notes..."
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <MaterialIcons name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : (
          <MaterialIcons name="mic" size={20} color={COLORS.textSecondary} />
        )}
      </View>
    </View>
  );

  const filterTasks = (tasks: Task[]) => {
    if (!searchText.trim()) return tasks;
    
    const searchTerms = searchText.toLowerCase().trim().split(' ');
    
    return tasks.filter(task => {
      const title = task.title?.toLowerCase() || '';
      const content = task.content?.toLowerCase() || '';
      
      return searchTerms.every(term => 
        title.includes(term) || content.includes(term)
      );
    });
  };

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity>
        <MaterialIcons name="keyboard-arrow-down" size={24} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  const createNewNote = () => {
    const newId = Date.now().toString();
    const newNote = {
      id: newId,
      key: newId,
      title: '',
      content: '',
      completed: false,
      createdAt: new Date(),
      audioUris: [],
      imageUris: [],
      links: []
    };
    setTasks(prevTasks => [...prevTasks, newNote]);
    setEditingTask(newNote);
    setIsModalVisible(true);
  };

  const shareNote = async (task: Task) => {
    try {
      // Préparer le contenu textuel
      let content = `${task.title}\n\n`;
      if (task.content) {
        content += `${task.content}\n\n`;
      }

      // Ajouter les liens
      if (task.links && task.links.length > 0) {
        content += "Liens :\n";
        task.links.forEach(link => {
          content += `- ${link.title || link.url}\n${link.url}\n`;
        });
        content += "\n";
      }

      // Préparer les fichiers à partager
      const files: string[] = [];

      // Ajouter les images
      if (task.imageUris && task.imageUris.length > 0) {
        files.push(...task.imageUris);
      }

      // Ajouter les notes vocales
      if (task.audioUris && task.audioUris.length > 0) {
        files.push(...task.audioUris);
      }

      if (Platform.OS === 'ios') {
        // Sur iOS, on partage le contenu avec chaque fichier
        if (files.length > 0) {
          for (const file of files) {
            try {
              await Share.share({
                message: content,
                url: file
              });
            } catch (error) {
              console.error('Erreur lors du partage du fichier:', error);
            }
          }
        } else {
          // Partager juste le contenu s'il n'y a pas de fichiers
          await Share.share({
            message: content
          });
        }
      } else {
        // Sur Android, on utilise une approche différente pour partager plusieurs fichiers
        if (files.length > 0) {
          await Share.share({
            message: content,
            url: files.join(',')
          });
        } else {
          await Share.share({
            message: content
          });
        }
      }
    } catch (error) {
      console.error('Erreur de partage:', error);
      Alert.alert('Erreur', "Impossible de partager la note");
    }
  };

  const renderNoteItem = (task: Task) => {
    const firstImage = task.imageUris[0];
    const firstLink = task.links?.[0];
    
    return (
      <TouchableOpacity 
        key={task.id}
        style={styles.noteItem}
        onPress={() => {
          setEditingTask(task);
          setIsModalVisible(true);
        }}
      >
        <View style={styles.noteContent}>
          <View style={styles.noteHeader}>
            <Text style={styles.noteTitle} numberOfLines={1}>
              {task.title || "Note sans titre"}
            </Text>
          </View>
          <View style={styles.noteInfo}>
            <Text style={styles.noteDate}>
              {formatDate(task.createdAt)}
            </Text>
            <Text style={styles.notePreview} numberOfLines={1}>
              {task.content || "Note"}
            </Text>
          </View>
          {firstLink && (
            <View style={styles.linkPreview}>
              {firstLink.type === 'location' ? (
                <View style={styles.locationContainer}>
                  <MaterialIcons name="location-on" size={20} color={COLORS.primary} />
                  <Text style={styles.linkTitle} numberOfLines={1}>
                    {firstLink.title || firstLink.url}
                  </Text>
                </View>
              ) : (
                <View style={styles.websiteContainer}>
                  <MaterialIcons name="link" size={20} color={COLORS.primary} />
                  <Text style={styles.linkTitle} numberOfLines={1}>
                    {firstLink.title || firstLink.url}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        {firstImage && (
          <View style={styles.thumbnailContainer}>
            <Image 
              source={{ uri: firstImage }} 
              style={styles.noteThumbnail}
              resizeMode="cover"
            />
            {task.imageUris.length > 1 && (
              <View style={styles.imageCountBadge}>
                <Text style={styles.imageCountText}>+{task.imageUris.length - 1}</Text>
              </View>
            )}
          </View>
        )}
        <TouchableOpacity
          style={styles.deleteButtonAbsolute}
          onPress={() => deleteTask(task.id)}
        >
          <MaterialIcons name="delete-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const modalImageGrid = editingTask?.imageUris && editingTask.imageUris.length > 0 && (
    <View style={styles.modalImageGrid}>
      {editingTask.imageUris.map((uri, index) => (
        <TouchableOpacity
          key={index}
          style={styles.modalImageContainer}
          onPress={() => setSelectedImage(uri)}
        >
          <Image 
            source={{ uri }} 
            style={styles.modalImage}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.imageDeleteButton}
            onPress={() => deleteImage(index)}
          >
            <LinearGradient
              colors={['#FF6B6B', '#FF3B30']}
              style={styles.imageDeleteButtonGradient}
            >
              <MaterialIcons name="delete-outline" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );

  const stopAudio = async () => {
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        setCurrentPlayingUri(null);
      } catch (error) {
        console.error('Erreur lors de l\'arrêt de l\'audio:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {renderHeader()}
      <ScrollView style={styles.content}>
        {renderSearchBar()}
        
        {Object.entries(groupTasksByDate(filterTasks(tasks))).map(([title, groupTasks]) => {
          if (groupTasks.length === 0) return null;
          
          return (
            <View key={title} style={styles.section}>
              <Text style={styles.sectionTitle}>{title}</Text>
              {groupTasks.map(task => (
                <View key={task.id}>
                  {renderTask(task)}
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity 
        style={styles.newNoteButton}
        onPress={createNewNote}
      >
        <MaterialIcons name="add" size={30} color={COLORS.text} />
      </TouchableOpacity>

      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
        statusBarTranslucent={true}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity
            style={styles.imageModalCloseButton}
            onPress={() => setSelectedImage(null)}
          >
            <MaterialIcons name="close" size={24} color="white" />
          </TouchableOpacity>
          {selectedImage && (
            <View style={styles.imageModalContent}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.imageModalImage}
                resizeMode="contain"
              />
            </View>
          )}
          <View style={styles.imageModalControls}>
            <TouchableOpacity
              style={styles.imageModalShareButton}
              onPress={() => {
                if (selectedImage) {
                  Share.share({
                    url: selectedImage,
                  });
                }
              }}
            >
              <MaterialIcons name="share" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={async () => {
                await stopAudio();
                setIsModalVisible(false);
                setEditingTask(null);
                setRecording(null);
              }}
            >
              <Text style={styles.modalHeaderButton}>Annuler</Text>
            </TouchableOpacity>
            <View style={styles.modalHeaderActions}>
              <TouchableOpacity
                style={styles.modalHeaderAction}
                onPress={() => editingTask && shareNote(editingTask)}
              >
                <MaterialIcons name="share" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  await stopAudio();
                  if (editingTask) {
                    updateTask(editingTask.id, editingTask);
                  }
                }}
              >
                <Text style={styles.modalHeaderButton}>Terminer</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.modalTitleInput}
              value={editingTask?.title}
              onChangeText={(text) => setEditingTask(prev => prev ? {...prev, title: text} : null)}
              placeholder="Titre"
              placeholderTextColor="#666"
            />
            
            {editingTask?.audioUris && editingTask.audioUris.length > 0 && (
              <View style={styles.modalAudioList}>
                {editingTask.audioUris.map((uri, index) => (
                  <View key={index} style={styles.modalAudioContainer}>
                    <TouchableOpacity
                      style={styles.modalAudioPlayButton}
                      onPress={() => playSound(uri)}
                    >
                      <FontAwesome5
                        name={currentPlayingUri === uri && isPlaying ? "pause" : "play"}
                        size={24}
                        color="white"
                      />
                    </TouchableOpacity>
                    <View style={styles.modalWaveformContainer}>
                      <AudioVisualizer />
                    </View>
                    <TouchableOpacity
                      style={styles.modalAudioDeleteButton}
                      onPress={() => deleteAudio(index)}
                    >
                      <MaterialIcons name="delete-outline" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {recording ? (
              <View style={styles.recordingContainer}>
                <View style={styles.recordingInfo}>
                  <FontAwesome5 name="microphone" size={24} color="#FF3B30" />
                  <Text style={styles.recordingTimer}>{formatDuration(recordingDuration)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.stopRecordingButton}
                  onPress={stopRecording}
                >
                  <FontAwesome5 name="stop" size={24} color="white" />
                </TouchableOpacity>
              </View>
            ) : null}

            <TextInput
              style={styles.modalContentInput}
              value={editingTask?.content}
              onChangeText={(text) => setEditingTask(prev => prev ? {...prev, content: text} : null)}
              placeholder="Note"
              placeholderTextColor="#666"
              multiline
              textAlignVertical="top"
            />
            
            {modalImageGrid}
          </ScrollView>

          <View style={styles.modalToolbar}>
            <TouchableOpacity
              style={[
                styles.toolbarButton,
                (editingTask && editingTask.imageUris && editingTask.imageUris.length >= 5) && styles.toolbarButtonDisabled
              ]}
              onPress={pickImage}
              disabled={editingTask && editingTask.imageUris ? editingTask.imageUris.length >= 5 : false}
            >
              <Ionicons 
                name="image" 
                size={24} 
                color={(editingTask && editingTask.imageUris && editingTask.imageUris.length >= 5) ? COLORS.textSecondary : COLORS.primary} 
              />
            </TouchableOpacity>
            {!recording && (
              <TouchableOpacity
                style={[
                  styles.toolbarButton,
                  (editingTask && editingTask.audioUris && editingTask.audioUris.length >= 5) && styles.toolbarButtonDisabled
                ]}
                onPress={startRecording}
                disabled={editingTask && editingTask.audioUris ? editingTask.audioUris.length >= 5 : false}
              >
                <FontAwesome5 
                  name="microphone" 
                  size={24} 
                  color={(editingTask && editingTask.audioUris && editingTask.audioUris.length >= 5) ? COLORS.textSecondary : COLORS.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.text,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 17,
    marginLeft: 8,
    marginRight: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  noteItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    marginBottom: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  noteContent: {
    flex: 1,
    marginRight: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  noteTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  noteInfo: {
    flexDirection: 'column',
  },
  noteDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  notePreview: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  noteThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  taskContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  taskContent: {
    padding: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  taskPreview: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  taskImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  taskDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 0.25,
  },
  deleteButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteButtonGradient: {
    padding: 6,
    borderRadius: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.modalBackground,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderButton: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '600',
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalTitleInput: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    color: COLORS.text,
    letterSpacing: 0.35,
    backgroundColor: 'transparent',
  },
  modalContentInput: {
    fontSize: 17,
    color: COLORS.text,
    minHeight: 200,
    lineHeight: 24,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
  },
  modalImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    borderRadius: 12,
  },
  modalToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  toolbarButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: COLORS.background,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderRadius: 20,
    marginVertical: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.1)',
  },
  audioPlayButtonGradient: {
    borderRadius: 24,
    padding: 12,
    marginRight: 16,
  },
  audioPlayButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,122,255,0.05)',
    borderRadius: 24,
    paddingHorizontal: 16,
  },
  audioText: {
    marginLeft: 6,
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalAudioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 20,
    marginVertical: 16,
    padding: 16,
  },
  modalAudioPlayButton: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalWaveformContainer: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderRadius: 28,
    paddingHorizontal: 16,
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderRadius: 20,
    marginVertical: 16,
    padding: 16,
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingTimer: {
    marginLeft: 12,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.error,
    letterSpacing: 0.38,
  },
  stopRecordingButton: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.error,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.error,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  audioIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioVisualizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 32,
    width: '100%',
    paddingHorizontal: 8,
  },
  audioBar: {
    width: 3,
    borderRadius: 1.5,
    opacity: 0.9,
  },
  audioDeleteButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  modalAudioDeleteButton: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  imageScrollView: {
    marginVertical: 12,
  },
  modalImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 16,
    gap: 12,
  },
  modalImageContainer: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  imageDeleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageDeleteButtonGradient: {
    padding: 8,
    borderRadius: 12,
  },
  audioList: {
    marginVertical: 12,
    gap: 8,
  },
  modalAudioList: {
    marginVertical: 16,
    gap: 12,
  },
  toolbarButtonDisabled: {
    opacity: 0.5,
  },
  imageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  imageText: {
    marginLeft: 4,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 2,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 24,
  },
  imageModalControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  imageModalShareButton: {
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 24,
    marginHorizontal: 8,
  },
  newNoteButton: {
    position: 'absolute',
    right: 30,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  taskList: {
    width: '100%',
    paddingVertical: 8,
  },
  taskBlurContainer: {
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: COLORS.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkPreview: {
    marginTop: 8,
    padding: 8,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  websiteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkTitle: {
    fontSize: 15,
    color: COLORS.primary,
    flex: 1,
  },
  thumbnailContainer: {
    position: 'relative',
    width: 60,
    height: 60,
    marginRight: 40,
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  imageCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButtonAbsolute: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    padding: 6,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
  },
  noteActions: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 1,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  modalHeaderAction: {
    padding: 8,
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  pinnedButton: {
    transform: [{ rotate: '45deg' }],
  },
});

export default App;

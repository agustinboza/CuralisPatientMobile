import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, ScrollView, Alert, SafeAreaView } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../../shared/constants';
import api from '../../../shared/api';
import { Appointment, AvailabilitySlot, Patient, AppointmentType } from '../../../shared/types';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const formatDate = (d: Date) => d.toLocaleDateString();

export const AppointmentsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  // For simplicity, let the backend infer default doctor. If needed, wire doctor selection later.
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [clinicians, setClinicians] = useState<Patient[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [doctorModalVisible, setDoctorModalVisible] = useState(false);
  const [doctorQuery, setDoctorQuery] = useState('');
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<AvailabilitySlot | null>(null);
  const [selectedType, setSelectedType] = useState<AppointmentType>('GENERAL');
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthSlots, setMonthSlots] = useState<Map<string, AvailabilitySlot[]>>(new Map());

  const loadMyAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.getMyAppointments();
      if (res.success && res.data) setAppointments(res.data);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async () => {
    if (!doctorId) return;
    const res = await api.getDoctorAvailability(doctorId, selectedDate, 30);
    if (res.success && res.data) {
      // Backend now only returns available slots
      setSlots(res.data);
    }
  };

  const loadMonthAvailability = async () => {
    if (!doctorId) return;
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const newMonthSlots = new Map<string, AvailabilitySlot[]>();
    
    // Load availability for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      try {
        const res = await api.getDoctorAvailability(doctorId, dateISO, 30);
        if (res.success && res.data) {
          // Backend now only returns available slots
          if (res.data.length > 0) {
            newMonthSlots.set(dateISO, res.data);
          }
        }
      } catch (error) {
        console.error(`Error loading availability for ${dateISO}:`, error);
      }
    }
    
    setMonthSlots(newMonthSlots);
  };

  useEffect(() => {
    loadMyAppointments();
    (async () => {
      const res = await api.getClinicians();
      if (res.success && res.data) {
        setClinicians(res.data as any);
        if (!doctorId && res.data.length > 0) setDoctorId(res.data[0].id);
      }
    })();
  }, []);

  useEffect(() => {
    loadAvailability();
  }, [doctorId, selectedDate]);

  useEffect(() => {
    loadMonthAvailability();
  }, [doctorId, currentMonth]);

  const confirmBook = async (slot: AvailabilitySlot, type: AppointmentType) => {
    if (!doctorId) return;
    const selectedDateISO = selectedDate; // Move outside try block for scope
    
    try {
      setBooking(true);
      
      // Immediately remove the slot from the current view for instant feedback
      setSlots(prevSlots => prevSlots.filter(s => 
        s.startTime.getTime() !== slot.startTime.getTime()
      ));
      
      // Also update the month slots for the selected date
      setMonthSlots(prevMonthSlots => {
        const newMonthSlots = new Map(prevMonthSlots);
        const daySlots = newMonthSlots.get(selectedDateISO);
        if (daySlots) {
          const updatedDaySlots = daySlots.filter(s => 
            s.startTime.getTime() !== slot.startTime.getTime()
          );
          if (updatedDaySlots.length > 0) {
            newMonthSlots.set(selectedDateISO, updatedDaySlots);
          } else {
            newMonthSlots.delete(selectedDateISO);
          }
        }
        return newMonthSlots;
      });
      
      const response = await api.bookAppointment(doctorId, slot.startTime, 30, type);
      
      if (response.success) {
        // Show success message
        Alert.alert('Success', 'Appointment booked successfully!');
        
        // Refresh all data with a small delay to ensure backend has processed
        setTimeout(async () => {
          await Promise.all([
            loadMyAppointments(), 
            loadAvailability(), 
            loadMonthAvailability()
          ]);
        }, 500);
      } else {
        // If booking failed, restore the slot
        setSlots(prevSlots => [...prevSlots, slot]);
        // Restore month slots
        setMonthSlots(prevMonthSlots => {
          const newMonthSlots = new Map(prevMonthSlots);
          const daySlots = newMonthSlots.get(selectedDateISO) || [];
          newMonthSlots.set(selectedDateISO, [...daySlots, slot]);
          return newMonthSlots;
        });
        Alert.alert('Error', 'Failed to book appointment. Please try again.');
      }
    } catch (error) {
      console.error('Booking error:', error);
      console.error('Error details:', {
        doctorId,
        startTime: slot.startTime,
        duration: 30,
        error: (error as any)?.message || error
      });
      
      // If booking failed, restore the slot
      setSlots(prevSlots => [...prevSlots, slot]);
      // Restore month slots
      setMonthSlots(prevMonthSlots => {
        const newMonthSlots = new Map(prevMonthSlots);
        const daySlots = newMonthSlots.get(selectedDateISO) || [];
        newMonthSlots.set(selectedDateISO, [...daySlots, slot]);
        return newMonthSlots;
      });
      
      // Show more detailed error message
      const errorMessage = (error as any)?.response?.data?.message || (error as any)?.message || 'Failed to book appointment. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setBooking(false);
    }
  };

  const book = (slot: AvailabilitySlot) => {
    setPendingSlot(slot);
    setSelectedType('GENERAL');
    setTypeModalVisible(true);
  };

  const navigateToMyAppointments = () => {
    navigation.navigate('MyAppointments' as never);
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Appointments</Text>
        <TouchableOpacity style={styles.myAppointmentsButton} onPress={navigateToMyAppointments}>
          <Ionicons name="list" size={20} color="white" />
          <Text style={styles.myAppointmentsButtonText}>My Appointments</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Doctor Selector */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
        <FlatList
          data={clinicians.slice(0, 6)}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setDoctorId(item.id)}
              style={[styles.doctorPill, doctorId === item.id && styles.doctorPillActive]}
            >
              <Text style={[styles.doctorPillText, doctorId === item.id && styles.doctorPillTextActive]}>
                {item.firstName} {item.lastName}
              </Text>
            </TouchableOpacity>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
        />
        <TouchableOpacity style={styles.doctorMoreBtn} onPress={() => setDoctorModalVisible(true)}>
          <Ionicons name="search" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <Modal visible={doctorModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Find a Doctor</Text>
            <TextInput
              placeholder="Search by name or email"
              placeholderTextColor={COLORS.textSecondary}
              value={doctorQuery}
              onChangeText={setDoctorQuery}
              style={styles.searchInput}
            />
            <ScrollView style={{ maxHeight: 300 }}>
              {clinicians
                .filter(c => `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(doctorQuery.toLowerCase()))
                .map(c => (
                  <TouchableOpacity key={c.id} style={styles.modalRow} onPress={() => { setDoctorId(c.id); setDoctorModalVisible(false); }}>
                    <Ionicons name="person" size={18} color={COLORS.primary} />
                    <Text style={styles.modalRowText}>{c.firstName} {c.lastName} • {c.email}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDoctorModalVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Appointment Type Modal */}
      <Modal visible={typeModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select appointment type</Text>
            {/* For now only GENERAL, but leave structure for future types */}
            {(['GENERAL'] as AppointmentType[]).map((t) => (
              <TouchableOpacity key={t} style={[styles.modalRow, selectedType === t && { opacity: 0.8 }]} onPress={() => setSelectedType(t)}>
                <Ionicons name={selectedType === t ? 'radio-button-on' : 'radio-button-off'} size={18} color={COLORS.primary} />
                <Text style={styles.modalRowText}>{t}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: COLORS.background }]} onPress={() => { setTypeModalVisible(false); setPendingSlot(null); }}>
                <Text style={[styles.modalCloseText, { color: COLORS.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { if (pendingSlot) { setTypeModalVisible(false); confirmBook(pendingSlot, selectedType); setPendingSlot(null); } }}>
                <Text style={styles.modalCloseText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Available Slots</Text>
          
          {/* Enhanced Month Grid Calendar */}
          <EnhancedMonthGrid 
            currentMonth={currentMonth}
            selectedDate={selectedDate} 
            onSelectDate={setSelectedDate}
            monthSlots={monthSlots}
            onMonthChange={changeMonth}
          />
          
          {/* Date Navigator */}
          <View style={styles.dateNavigator}>
            <TouchableOpacity onPress={() => {
              const d = new Date(selectedDate + 'T00:00:00');
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().slice(0,10));
            }} style={styles.dateBtn}>
              <Ionicons name="chevron-back" size={18} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.dateText}>{new Date(selectedDate + 'T00:00:00').toDateString()}</Text>
            <TouchableOpacity onPress={() => {
              const d = new Date(selectedDate + 'T00:00:00');
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().slice(0,10));
            }} style={styles.dateBtn}>
              <Ionicons name="chevron-forward" size={18} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {!doctorId ? (
            <Text style={styles.helper}>Select a doctor first to view availability.</Text>
          ) : slots.length === 0 ? (
            <Text style={styles.helper}>No available slots for {selectedDate}.</Text>
          ) : (
            <ScrollView 
              style={styles.slotsList}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {slots.map((item, index) => (
                <TouchableOpacity 
                  key={`${item.startTime.toISOString()}-${index}`}
                  disabled={booking} 
                  onPress={() => book(item)} 
                  style={styles.slot}
                >
                  <Text style={styles.slotText}>{formatTime(item.startTime)} - {formatTime(item.endTime)}</Text>
                  <Ionicons name="add" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      )}
      </ScrollView>
    </SafeAreaView>
  );
};

// Enhanced Month Grid Component with dots and month navigation
const EnhancedMonthGrid: React.FC<{ 
  currentMonth: Date; 
  selectedDate: string; 
  onSelectDate: (d: string) => void;
  monthSlots: Map<string, AvailabilitySlot[]>;
  onMonthChange: (direction: 'prev' | 'next') => void;
}> = ({ currentMonth, selectedDate, onSelectDate, monthSlots, onMonthChange }) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days: Array<{ key: string; label: string; date: string; isSelected: boolean; hasSlots: boolean } | null> = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startWeekday; i++) days.push(null);
  
  // Add days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hasSlots = monthSlots.has(dateISO);
    days.push({ 
      key: dateISO, 
      label: String(d), 
      date: dateISO, 
      isSelected: dateISO === selectedDate,
      hasSlots 
    });
  }

  return (
    <View style={styles.calendarContainer}>
      {/* Month Navigation */}
      <View style={styles.monthNavigation}>
        <TouchableOpacity onPress={() => onMonthChange('prev')} style={styles.monthNavButton}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {currentMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => onMonthChange('next')} style={styles.monthNavButton}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Day Headers */}
      <View style={styles.dayHeaders}>
        {['S','M','T','W','T','F','S'].map((lbl, index) => (
          <View key={`h-${index}`} style={styles.dayHeader}>
            <Text style={styles.dayHeaderText}>{lbl}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {days.map((d, i) => d ? (
          <TouchableOpacity 
            key={d.key} 
            style={[
              styles.dayCell, 
              d.isSelected && styles.dayCellSelected,
              d.hasSlots && styles.dayCellWithSlots
            ]} 
            onPress={() => onSelectDate(d.date)}
          >
            <Text style={[
              styles.dayCellText, 
              d.isSelected && styles.dayCellTextSelected
            ]}>
              {d.label}
            </Text>
            {d.hasSlots && (
              <View style={[
                styles.availabilityDot,
                d.isSelected ? styles.availabilityDotSelected : styles.availabilityDotDefault
              ]} />
            )}
          </TouchableOpacity>
        ) : (
          <View key={`e-${i}`} style={styles.dayCellEmpty} />
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotGreen]} />
          <Text style={styles.legendText}>Available slots</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotOrange]} />
          <Text style={styles.legendText}>Limited availability</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: COLORS.text 
  },
  myAppointmentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  myAppointmentsButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: COLORS.textSecondary, 
    marginBottom: SPACING.sm 
  },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.surface, 
    padding: SPACING.md, 
    borderRadius: BORDER_RADIUS.lg, 
    marginBottom: SPACING.sm 
  },
  cardTitle: { 
    color: COLORS.text, 
    fontWeight: '600' 
  },
  cardSubtitle: { 
    color: COLORS.textSecondary, 
    marginTop: 2 
  },
  empty: { 
    color: COLORS.textSecondary, 
    marginVertical: SPACING.md 
  },
  helper: { 
    color: COLORS.textSecondary 
  },
  doctorPill: { 
    backgroundColor: COLORS.surface, 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 999, 
    marginRight: 8 
  },
  doctorPillActive: { 
    backgroundColor: COLORS.primary + '20' 
  },
  doctorPillText: { 
    color: COLORS.text 
  },
  doctorPillTextActive: { 
    color: COLORS.primary, 
    fontWeight: '600' 
  },
  slotsList: {
    maxHeight: 200,
    marginBottom: SPACING.md,
  },
  slot: { 
    backgroundColor: COLORS.surface, 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: BORDER_RADIUS.md, 
    marginBottom: 8, 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  slotText: { 
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500'
  },
  dateBtn: { 
    backgroundColor: COLORS.surface, 
    padding: 8, 
    borderRadius: 999 
  },
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  dateText: {
    color: COLORS.text,
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  statusPill: { 
    backgroundColor: COLORS.background, 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 999 
  },
  statusText: { 
    color: COLORS.textSecondary, 
    fontSize: 12, 
    textTransform: 'capitalize' 
  },
  checkinBtn: { 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 999 
  },
  checkinText: { 
    color: 'white', 
    fontWeight: '600' 
  },
  doctorMoreBtn: { 
    marginLeft: 8, 
    backgroundColor: COLORS.surface, 
    padding: 10, 
    borderRadius: 12 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: { 
    width: '90%', 
    backgroundColor: COLORS.surface, 
    borderRadius: 16, 
    padding: 16 
  },
  modalTitle: { 
    color: COLORS.text, 
    fontSize: 18, 
    fontWeight: '600', 
    marginBottom: 8 
  },
  searchInput: { 
    backgroundColor: COLORS.background, 
    color: COLORS.text, 
    padding: 10, 
    borderRadius: 10, 
    marginBottom: 10 
  },
  modalRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 10 
  },
  modalRowText: { 
    color: COLORS.text, 
    marginLeft: 8 
  },
  modalCloseBtn: { 
    backgroundColor: COLORS.primary, 
    padding: 12, 
    borderRadius: 12, 
    marginTop: 12, 
    alignItems: 'center' 
  },
  modalCloseText: { 
    color: 'white', 
    fontWeight: '600' 
  },
  
  // Calendar Styles
  calendarContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  monthNavButton: {
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  dayHeader: {
    width: '14.28%',
    alignItems: 'center',
  },
  dayHeaderText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: { 
    width: '14.28%', 
    aspectRatio: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 2, 
    borderRadius: 8, 
    backgroundColor: COLORS.background,
    position: 'relative',
  },
  dayCellSelected: { 
    backgroundColor: COLORS.primary + '20' 
  },
  dayCellWithSlots: {
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  dayCellText: { 
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  dayCellTextSelected: { 
    color: COLORS.primary, 
    fontWeight: '700' 
  },
  dayCellEmpty: { 
    width: '14.28%', 
    aspectRatio: 1, 
    marginBottom: 6 
  },
  availabilityDot: {
    position: 'absolute',
    bottom: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availabilityDotDefault: {
    backgroundColor: '#10B981', // Green
  },
  availabilityDotSelected: {
    backgroundColor: COLORS.primary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  legendDotGreen: {
    backgroundColor: '#10B981',
  },
  legendDotOrange: {
    backgroundColor: '#F59E0B',
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

export default AppointmentsScreen;
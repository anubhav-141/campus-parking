package parking.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ParkingServiceTest {

    @Test
    void deriveZoneCode_handlesStandardZoneName() {
        assertEquals("A", ParkingService.deriveZoneCode("Zone A - Main Building"));
        assertEquals("B", ParkingService.deriveZoneCode("Zone B - Library"));
    }

    @Test
    void deriveZoneCode_buildsInitialsFromMultiWordName() {
        assertEquals("EB", ParkingService.deriveZoneCode("Engineering Block"));
        assertEquals("MBP", ParkingService.deriveZoneCode("Main Building Parking"));
    }

    @Test
    void deriveZoneCode_handlesSingleWord() {
        assertEquals("LIB", ParkingService.deriveZoneCode("Library"));
        assertEquals("GYM", ParkingService.deriveZoneCode("Gymnasium"));
    }

    @Test
    void deriveZoneCode_fallsBackOnEmptyInput() {
        assertEquals("Z", ParkingService.deriveZoneCode(""));
        assertEquals("Z", ParkingService.deriveZoneCode(null));
    }
}


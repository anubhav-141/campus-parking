package parking.dto;

import jakarta.validation.constraints.NotNull;

public class SlotStatusUpdate {

    @NotNull(message = "Status is required")
    private String status;

    public SlotStatusUpdate() {}

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}

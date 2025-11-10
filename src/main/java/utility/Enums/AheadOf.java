package utility.Enums;

public enum AheadOf {
	

	Second(1000L), Minute(60000L), Houre(3600000L), Day(86400000L), Year(31536000000L);

	private long value;
	AheadOf(long value) {
		this.value = value;
	}

	public long toInt() {
		return value;
	}

}

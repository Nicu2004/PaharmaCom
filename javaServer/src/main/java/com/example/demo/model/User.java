import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String lastName; // Name

    @Column(nullable = false)
    private String firstName; // Forename

    @Column(nullable = false, unique = true)
    private String email;

    // Nullable because Google Auth users won't have a local password
    @Column(nullable = true)
    private String password;

    @Column(nullable = false)
    private boolean isGoogleConnected = false;

    // Note: Storing date of birth (LocalDate) is generally safer than storing 
    // a static 'age' integer so it updates automatically, but here is the age field.
    @Column(nullable = false)
    private Integer age;

    @Column(nullable = false)
    private String city;

    // Standard Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public boolean isGoogleConnected() { return isGoogleConnected; }
    public void setGoogleConnected(boolean googleConnected) { isGoogleConnected = googleConnected; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
}
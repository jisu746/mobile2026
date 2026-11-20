// 회원가입·로그인·로그아웃·내 정보 API
package com.storemate.backend.web;

import com.storemate.backend.domain.Account;
import com.storemate.backend.domain.AuthToken;
import com.storemate.backend.domain.Role;
import com.storemate.backend.repo.AccountRepository;
import com.storemate.backend.repo.AuthTokenRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api")
public class AuthController {
    private static final Pattern USERNAME = Pattern.compile("^[a-z0-9]{1,30}$");
    // 앱과 같은 규칙: 영문 + 숫자 + 특수문자 조합
    private static final Pattern PASSWORD = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$");

    private final AccountRepository accounts;
    private final AuthTokenRepository tokens;
    private final AccountViews views;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();

    public AuthController(AccountRepository accounts, AuthTokenRepository tokens, AccountViews views) {
        this.accounts = accounts;
        this.tokens = tokens;
        this.views = views;
    }

    static Role role(String value) {
        if ("owner".equals(value)) return Role.OWNER;
        if ("staff".equals(value)) return Role.STAFF;
        throw new ApiException(HttpStatus.BAD_REQUEST, "사용자 유형이 올바르지 않아요");
    }

    @GetMapping("/auth/exists")
    Map<String, Boolean> exists(@RequestParam String username) {
        return Map.of("exists", accounts.existsByUsername(username));
    }

    @PostMapping("/auth/signup")
    @ResponseStatus(HttpStatus.CREATED)
    void signup(@RequestBody Dto.SignupRequest r) {
        if (r.username() == null || !USERNAME.matcher(r.username()).matches())
            throw new ApiException(HttpStatus.BAD_REQUEST, "아이디는 알파벳 소문자와 숫자만 사용할 수 있어요");
        if (r.password() == null || !PASSWORD.matcher(r.password()).matches())
            throw new ApiException(HttpStatus.BAD_REQUEST, "비밀번호는 특수문자와 숫자, 알파벳 조합으로 만들어주세요");
        if (r.name() == null || r.name().isBlank())
            throw new ApiException(HttpStatus.BAD_REQUEST, "이름을 입력해주세요");
        Role role = role(r.role());
        if (accounts.existsByUsername(r.username()))
            throw new ApiException(HttpStatus.CONFLICT, "이미 사용 중인 아이디예요");
        accounts.save(new Account(r.username(), encoder.encode(r.password()), role, r.name().trim(), r.birth()));
    }

    @PostMapping("/auth/login")
    Dto.LoginResponse login(@RequestBody Dto.LoginRequest r) {
        Account a = accounts.findByUsername(r.username() == null ? "" : r.username()).orElse(null);
        // 아이디가 없는지, 비밀번호가 틀렸는지, 유형이 다른지는 구분해서 알려주지 않는다
        if (a == null || r.password() == null || !encoder.matches(r.password(), a.getPasswordHash()) || a.getRole() != role(r.role()))
            throw new ApiException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 일치하지 않아요");
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = HexFormat.of().formatHex(bytes);
        tokens.save(new AuthToken(token, a));
        return new Dto.LoginResponse(token, views.of(a));
    }

    @PostMapping("/auth/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(@RequestAttribute(AuthInterceptor.TOKEN) String token) {
        tokens.deleteById(token);
    }

    @GetMapping("/me")
    Dto.AccountView me(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account) {
        return views.of(account);
    }
}
